<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { featureMap } from '../core/featureRegistry';
import { onPermissionsAdded, requestPermissions } from '../core/permissions';
import { settings } from '../core/storage';
import { favicon } from '../core/utils';

const adding = ref(false);
const addTitle = ref('');
const addUrl = ref('');
let offPermissionAdded: (() => void) | undefined;

// 首次加载：把浏览器"最常访问"并入手动列表，之后列表完全由用户管理
async function loadAndSeed() {
  const ok = await requestPermissions(featureMap.quicklinks);
  if (!ok) return;
  try {
    const sites = await chrome.topSites.get();
    if (!settings.quickLinks.seeded) {
      const urls = new Set(settings.quickLinks.pins.map((p) => p.url));
      for (const s of sites) {
        if (!urls.has(s.url)) {
          settings.quickLinks.pins.push({ id: crypto.randomUUID(), title: s.title, url: s.url });
          urls.add(s.url);
        }
      }
      settings.quickLinks.seeded = true;
    }
  } catch {
    /* ignore */
  }
}

function onPermissionAdded(perms: chrome.permissions.Permissions) {
  if (perms.permissions?.includes('topSites')) void loadAndSeed();
}

onMounted(() => {
  void loadAndSeed();
  offPermissionAdded = onPermissionsAdded(onPermissionAdded);
});

onUnmounted(() => {
  offPermissionAdded?.();
});

const visible = computed(() => settings.quickLinks.pins.slice(0, settings.quickLinks.maxItems));

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
  if (i < 0) return;
  const [p] = settings.quickLinks.pins.splice(i, 1);
  if (!settings.quickLinks.hidden.some((h) => h.url === url)) {
    settings.quickLinks.hidden.push({ url, title: p.title });
  }
}

// ---- 拖拽排序 ----
const dragUrl = ref<string | null>(null);
const dragOverUrl = ref<string | null>(null);

function onDragStart(e: DragEvent, url: string) {
  dragUrl.value = url;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', url);
  }
}

function onDragEnd() {
  dragUrl.value = null;
  dragOverUrl.value = null;
}

function onRowDragOver(e: DragEvent, url: string) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dragOverUrl.value = url;
}

function clearDragOver() {
  dragOverUrl.value = null;
}

function onDrop(e: DragEvent, targetUrl: string) {
  e.preventDefault();
  const src = dragUrl.value ?? e.dataTransfer?.getData('text/plain');
  dragUrl.value = null;
  dragOverUrl.value = null;
  if (!src || src === targetUrl) return;
  const arr = settings.quickLinks.pins;
  const from = arr.findIndex((p) => p.url === src);
  const to = arr.findIndex((p) => p.url === targetUrl);
  if (from < 0 || to < 0) return;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
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
          :class="{ 'drag-over': dragOverUrl === s.url, dragging: dragUrl === s.url }"
          :href="s.url"
          target="_blank"
          rel="noreferrer"
          :title="`${s.title}（点击打开，拖动排序）`"
          draggable="true"
          @dragstart="onDragStart($event, s.url)"
          @dragend="onDragEnd"
          @dragover.prevent="onRowDragOver($event, s.url)"
          @dragleave="clearDragOver"
          @drop="onDrop($event, s.url)"
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
