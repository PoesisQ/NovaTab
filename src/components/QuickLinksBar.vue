<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { featureMap } from '../core/featureRegistry';
import { onPermissionsAdded, requestPermissions } from '../core/permissions';
import { settings } from '../core/storage';
import { favicon } from '../core/utils';

interface Site {
  title: string;
  url: string;
}

const sites = ref<Site[]>([]);
const adding = ref(false);
const addTitle = ref('');
const addUrl = ref('');
let offPermissionAdded: (() => void) | undefined;

async function loadSites() {
  const ok = await requestPermissions(featureMap.quicklinks);
  if (!ok) return;
  try {
    sites.value = (await chrome.topSites.get()).map((s) => ({ title: s.title, url: s.url }));
  } catch {
    sites.value = [];
  }
}

function onPermissionAdded(perms: chrome.permissions.Permissions) {
  if (perms.permissions?.includes('topSites')) void loadSites();
}

onMounted(() => {
  void loadSites();
  offPermissionAdded = onPermissionsAdded(onPermissionAdded);
});

onUnmounted(() => {
  offPermissionAdded?.();
});

const pins = computed(() => settings.quickLinks.pins);
const hiddenUrls = computed(() => new Set(settings.quickLinks.hidden.map((h) => h.url)));

const visible = computed(() => {
  const urls = new Set(pins.value.map((p) => p.url));
  const merged = [
    ...pins.value,
    ...sites.value.filter((s) => !urls.has(s.url) && !hiddenUrls.value.has(s.url))
  ];
  return merged.slice(0, settings.quickLinks.maxItems);
});

function addPin() {
  const title = addTitle.value.trim();
  let url = addUrl.value.trim();
  if (!title || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  settings.quickLinks.pins.push({ id: crypto.randomUUID(), title, url });
  addTitle.value = '';
  addUrl.value = '';
  adding.value = false;
}

// ✕ = 真正移除（进入隐藏名单，可到设置 → 常用网址 → 已隐藏的网址 中恢复）
function removeTile(url: string) {
  const i = settings.quickLinks.pins.findIndex((p) => p.url === url);
  let title = url;
  if (i >= 0) {
    title = settings.quickLinks.pins[i].title;
    settings.quickLinks.pins.splice(i, 1);
  } else {
    const s = visible.value.find((x) => x.url === url);
    if (s) title = s.title;
  }
  if (!settings.quickLinks.hidden.some((h) => h.url === url)) {
    settings.quickLinks.hidden.push({ url, title });
  }
}

function onFaviconError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  const fallback = img.nextElementSibling as HTMLElement | null;
  if (fallback) fallback.style.display = 'inline-flex';
}
</script>

<template>
  <div class="ql-bar">
    <div class="ql-row">
      <TransitionGroup name="tile">
        <a
          v-for="s in visible"
          :key="s.url"
          class="ql-tile"
          :href="s.url"
          target="_blank"
          rel="noreferrer"
        >
          <span class="ql-tile-ico">
            <img class="favicon-big" :src="favicon(s.url, 32)" alt="" @error="onFaviconError" />
            <span class="letter" style="display: none">{{ (s.title || '?').charAt(0).toUpperCase() }}</span>
          </span>
          <span class="ql-name" :title="s.title">{{ s.title }}</span>
          <span class="ql-tile-actions" @click.prevent>
            <button class="ql-tile-action" title="移除（可在设置中恢复）" @click="removeTile(s.url)">✕</button>
          </span>
        </a>
      </TransitionGroup>
      <button class="ql-tile ql-add-tile" @click="adding = !adding">
        <span class="ql-tile-ico">＋</span>
        <span class="ql-name">添加网址</span>
      </button>
    </div>
    <form v-if="adding" class="ql-add-form" @submit.prevent="addPin">
      <input v-model="addTitle" class="mini-input" placeholder="名称" />
      <input v-model="addUrl" class="mini-input" placeholder="https://…" />
      <button type="submit" class="chip">保存</button>
      <button type="button" class="chip" @click="adding = false">取消</button>
    </form>
  </div>
</template>
