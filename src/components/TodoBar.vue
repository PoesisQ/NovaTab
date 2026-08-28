<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { settings } from '../core/storage';
import { loadTodos, pushSync, todos, type TodoItem } from '../core/todos';
import Icon from './Icon.vue';
import { formatDue } from '../core/utils';

const managerOpen = ref(false);
const newText = ref('');
const withDue = ref(false);
const newDue = ref('');
const editingId = ref<string | null>(null);
const editingText = ref('');

// 按住左键划过连续标记完成
let dragging = false;
const dragToggled = new Set<string>();

onMounted(() => {
  void loadTodos();
  window.addEventListener('keydown', onWindowKeydown);
  window.addEventListener('mouseup', onWindowMouseup);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeydown);
  window.removeEventListener('mouseup', onWindowMouseup);
});

const items = computed(() => {
  const list = [...todos.state.items];
  return settings.todos.showDone ? list : list.filter((i) => !i.done);
});

const notesModel = computed({
  get: () => todos.state.notes,
  set: (v: string) => {
    todos.state.notes = v;
  }
});

function add() {
  const t = newText.value.trim();
  if (!t) return;
  const due = withDue.value && newDue.value ? new Date(newDue.value).getTime() : undefined;
  todos.state.items.push({ id: crypto.randomUUID(), text: t, done: false, ts: Date.now(), due });
  newText.value = '';
  newDue.value = '';
  withDue.value = false;
}

function toggle(id: string) {
  const it = todos.state.items.find((i) => i.id === id);
  if (it) it.done = !it.done;
}

function remove(id: string) {
  const i = todos.state.items.findIndex((x) => x.id === id);
  if (i >= 0) todos.state.items.splice(i, 1);
}

function move(id: string, dir: -1 | 1) {
  const arr = todos.state.items;
  const i = arr.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}

// ---- 单条编辑 ----
function startEdit(it: TodoItem) {
  editingId.value = it.id;
  editingText.value = it.text;
}

function saveEdit() {
  if (editingId.value) {
    const t = editingText.value.trim();
    const it = todos.state.items.find((i) => i.id === editingId.value);
    if (it && t) it.text = t;
  }
  editingId.value = null;
}

function cancelEdit() {
  editingId.value = null;
}

// ---- 点击 / 按住划过连续完成 ----
function onStripDown(id: string, e: MouseEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  dragging = true;
  dragToggled.clear();
  dragToggled.add(id);
  toggle(id);
}

function onStripEnter(id: string) {
  if (!dragging || dragToggled.has(id)) return;
  dragToggled.add(id);
  toggle(id);
}

function onWindowMouseup() {
  dragging = false;
  dragToggled.clear();
}

// ---- ESC 退出 ----
function onWindowKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  if (editingId.value) {
    cancelEdit();
    return;
  }
  if (managerOpen.value) managerOpen.value = false;
}

watch(
  () => [settings.todos.sync, todos.state.items, todos.state.notes],
  () => {
    if (settings.todos.sync) pushSync();
  },
  { deep: true }
);
</script>

<template>
  <div class="todo-bar" :class="[`pos-${settings.todos.position}`, settings.todos.theme === 'light' ? 'todo-light' : '']">
    <div class="todo-side">
      <button class="todo-manager-btn" title="管理待办（添加 / 删除 / 排序）" @click="managerOpen = !managerOpen">
        <Icon name="list" :size="22" />
      </button>
    </div>

    <TransitionGroup name="todo" tag="div" class="todo-strips">
      <div
        v-for="it in items"
        :key="it.id"
        class="todo-strip"
        :class="{ done: it.done, editing: editingId === it.id }"
        title="点击标记完成；按住左键划过可连续标记"
        @mousedown="onStripDown(it.id, $event)"
        @mouseenter="onStripEnter(it.id)"
      >
        <input class="todo-check" type="checkbox" :checked="it.done" @mousedown.stop @change="toggle(it.id)" />
        <input
          v-if="editingId === it.id"
          v-model="editingText"
          class="todo-edit-input"
          @mousedown.stop
          @keydown.enter.prevent="saveEdit()"
          @keydown.esc.prevent="cancelEdit()"
          @blur="saveEdit()"
        />
        <span v-else class="todo-strip-text" :title="it.text">{{ it.text }}</span>
        <span
          v-if="it.due && editingId !== it.id"
          class="todo-due"
          :class="{ overdue: it.due < Date.now() && !it.done }"
        >
          {{ formatDue(it.due) }}
        </span>
        <button v-if="editingId === it.id" class="mini" title="保存" @mousedown.stop @click="saveEdit()">✓</button>
        <button v-else class="mini" title="编辑" @mousedown.stop @click="startEdit(it)">✎</button>
        <button class="mini" title="删除" @mousedown.stop @click="remove(it.id)">✕</button>
      </div>
    </TransitionGroup>

    <div v-if="managerOpen" class="todo-manager-backdrop" @click="managerOpen = false" />
    <div v-if="managerOpen" class="todo-manager">
      <div class="tm-head">
        <span>待办管理</span>
        <button class="mini" @click="managerOpen = false">✕</button>
      </div>
      <form class="tm-add" @submit.prevent="add">
        <input v-model="newText" class="mini-input" placeholder="添加待办…" />
        <label class="tm-due-toggle" title="设置提醒日期和时间">
          <input type="checkbox" v-model="withDue" /> <Icon name="clock" :size="14" />
        </label>
        <button type="submit" class="chip">添加</button>
      </form>
      <input v-if="withDue" v-model="newDue" type="datetime-local" class="text-input" />
      <div class="tm-list">
        <div v-for="it in todos.state.items" :key="it.id" class="tm-item" :class="{ done: it.done }">
          <input class="todo-check" type="checkbox" :checked="it.done" @change="toggle(it.id)" />
          <span class="tm-text" :title="it.text">{{ it.text }}</span>
          <span v-if="it.due" class="todo-due">{{ formatDue(it.due) }}</span>
          <button class="mini" title="上移" @click="move(it.id, -1)">↑</button>
          <button class="mini" title="下移" @click="move(it.id, 1)">↓</button>
          <button class="mini" title="删除" @click="remove(it.id)">✕</button>
        </div>
        <div v-if="!todos.state.items.length" class="hint">暂无待办</div>
      </div>
      <textarea v-model="notesModel" class="notes" rows="2" placeholder="注意事项 / 备注…"></textarea>
    </div>
  </div>
</template>
