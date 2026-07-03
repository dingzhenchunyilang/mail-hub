<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="page-title">日程表</h1>

          <!-- View toggle -->
          <div class="flex border border-line-soft rounded-card overflow-hidden">
            <button
              @click="viewMode = 'month'"
              :class="[
                'px-3 py-1.5 text-xs font-mono transition-colors',
                viewMode === 'month' ? 'bg-ink text-paper' : 'text-ink-faint hover:text-ink'
              ]"
            >月视图</button>
            <button
              @click="viewMode = 'week'"
              :class="[
                'px-3 py-1.5 text-xs font-mono transition-colors border-l border-line-soft',
                viewMode === 'week' ? 'bg-ink text-paper' : 'text-ink-faint hover:text-ink'
              ]"
            >周视图</button>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <button @click="goToPrev" class="btn btn-ghost btn-sm px-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button @click="goToToday" class="btn btn-secondary btn-sm font-mono">今天</button>
          <button @click="goToNext" class="btn btn-ghost btn-sm px-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <span class="text-sm font-serif font-semibold text-ink ml-2">{{ currentTitle }}</span>
        </div>

        <button @click="openCreateModal" class="btn btn-primary">
          <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新建日程
        </button>
      </div>

      <!-- Upcoming events banner -->
      <div v-if="upcomingEvents.length > 0" class="mt-4 p-3 border border-line-soft rounded-card bg-paper-dim">
        <div class="flex items-center">
          <svg class="w-4 h-4 text-ink-faint mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs font-mono text-ink-faint mr-2">24h内 {{ upcomingEvents.length }} 个日程：</span>
          <span class="text-xs text-ink">{{ upcomingEvents.map(e => e.title).join('、') }}</span>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-3 flex items-center space-x-5 text-[11px] font-mono text-ink-faint">
        <div class="flex items-center space-x-1.5">
          <span class="w-4 h-3 border-[1.5px] border-ink rounded-sm inline-block"></span>
          <span>手动创建</span>
        </div>
        <div class="flex items-center space-x-1.5">
          <span class="w-4 h-3 border-[1.5px] border-dashed border-stamp-red rounded-sm inline-block"></span>
          <span>AI 建议（待确认）</span>
        </div>
        <div class="flex items-center space-x-1.5">
          <span class="inline-block text-stamp-red text-sm leading-none">✓</span>
          <span>已完成</span>
        </div>
      </div>
    </header>

    <!-- Calendar body -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Month view -->
      <div v-if="viewMode === 'month'" class="card">
        <!-- Weekday header -->
        <div class="grid grid-cols-7 border-b border-line-soft">
          <div v-for="day in weekDays" :key="day" class="px-2 py-2.5 text-center text-[11px] font-mono text-ink-faint uppercase">
            {{ day }}
          </div>
        </div>

        <!-- Day cells -->
        <div class="grid grid-cols-7">
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            :class="[
              'min-h-[100px] p-2 border-b border-r border-line-soft/50 cursor-pointer hover:bg-paper-dim transition-colors',
              !day.isCurrentMonth ? 'bg-paper-dim/50 text-ink-faint' : '',
            ]"
            @click="openCreateModal(day.date)"
          >
            <div class="flex items-center justify-between mb-1">
              <span
                :class="[
                  'text-xs font-mono',
                  day.isToday
                    ? 'w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center font-medium'
                    : 'text-ink'
                ]"
              >{{ day.day }}</span>
              <span v-if="day.events.length > 0" class="text-[10px] font-mono text-ink-faint">{{ day.events.length }}</span>
            </div>

            <!-- Event chips -->
            <div class="space-y-1">
              <div
                v-for="event in day.events.slice(0, 3)"
                :key="event.id"
                @click.stop="editEvent(event)"
                :class="[
                  'group flex items-center text-[11px] px-1.5 py-0.5 rounded-sm truncate cursor-pointer transition-colors',
                  event.source === 'ai'
                    ? 'ai-suggestion text-stamp-red hover:bg-stamp-red/5'
                    : 'manual-event text-ink hover:bg-ink/5',
                  event.completed ? 'event-completed' : '',
                  confirmingIds.has(event.id) ? 'calendar-event-confirming' : ''
                ]"
              >
                <span v-if="event.source === 'ai'" class="mr-1 text-[9px] font-mono">AI</span>
                <span class="flex-1 truncate">{{ event.title }}</span>
                <!-- 完成戳印按钮 -->
                <button
                  @click.stop="toggleComplete(event)"
                  :class="[
                    'flex-shrink-0 ml-1 w-4 h-4 rounded-full border flex items-center justify-center transition-all stamp-btn',
                    event.completed
                      ? 'bg-stamp-red border-stamp-red text-paper opacity-100'
                      : 'border-line-soft text-transparent opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:border-stamp-red hover:text-stamp-red'
                  ]"
                  :title="event.completed ? '标记未完成' : '标记完成'"
                >
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </button>
              </div>
              <div v-if="day.events.length > 3" class="text-[10px] font-mono text-ink-faint px-1.5">
                +{{ day.events.length - 3 }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Week view -->
      <div v-else class="card">
        <!-- Day header -->
        <div class="grid grid-cols-7 border-b border-line-soft">
          <div
            v-for="day in weekViewDays"
            :key="day.date"
            :class="['px-2 py-2.5 text-center', day.isToday ? 'bg-paper-dim' : '']"
          >
            <div class="text-[11px] font-mono text-ink-faint uppercase">{{ day.weekday }}</div>
            <div
              :class="[
                'text-sm font-mono font-medium mt-1',
                day.isToday
                  ? 'w-7 h-7 bg-ink text-paper rounded-full inline-flex items-center justify-center'
                  : 'text-ink'
              ]"
            >{{ day.day }}</div>
          </div>
        </div>

        <!-- Day rows with events -->
        <div class="grid grid-cols-7 min-h-[400px]">
          <div
            v-for="day in weekViewDays"
            :key="day.date"
            :class="[
              'p-2 border-r border-line-soft/50 cursor-pointer hover:bg-paper-dim transition-colors',
              day.isToday ? 'bg-paper-dim/30' : ''
            ]"
            @click="openCreateModal(day.date)"
          >
            <div class="space-y-1">
              <div
                v-for="event in getEventsForDate(day.date)"
                :key="event.id"
                @click.stop="editEvent(event)"
                :class="[
                  'group flex items-center text-[11px] px-1.5 py-1 rounded-sm cursor-pointer mb-1 transition-colors',
                  event.source === 'ai'
                    ? 'ai-suggestion text-stamp-red hover:bg-stamp-red/5'
                    : 'manual-event text-ink hover:bg-ink/5',
                  event.completed ? 'event-completed' : '',
                  confirmingIds.has(event.id) ? 'calendar-event-confirming' : ''
                ]"
              >
                <span v-if="event.source === 'ai'" class="mr-1 text-[9px] font-mono">AI</span>
                <span class="flex-1 truncate">{{ event.title }}</span>
                <button
                  @click.stop="toggleComplete(event)"
                  :class="[
                    'flex-shrink-0 ml-1 w-4 h-4 rounded-full border flex items-center justify-center transition-all stamp-btn',
                    event.completed
                      ? 'bg-stamp-red border-stamp-red text-paper opacity-100'
                      : 'border-line-soft text-transparent opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:border-stamp-red hover:text-stamp-red'
                  ]"
                  :title="event.completed ? '标记未完成' : '标记完成'"
                >
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit modal -->
    <div v-if="showModal" class="fixed inset-0 bg-ink/20 flex items-center justify-center z-50">
      <div class="bg-paper border border-line-soft rounded-card w-full max-w-lg mx-4">
        <div class="p-5 border-b border-line-soft">
          <h2 class="text-lg font-serif font-semibold">{{ editingEvent ? '编辑日程' : '新建日程' }}</h2>
        </div>

        <div class="p-5 space-y-4">
          <div>
            <label class="label">标题</label>
            <input v-model="form.title" type="text" class="input" placeholder="日程标题" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">开始日期</label>
              <input v-model="form.start_date" type="date" class="input" />
            </div>
            <div>
              <label class="label">结束日期</label>
              <input v-model="form.end_date" type="date" class="input" />
              <p class="text-[10px] font-mono text-ink-faint mt-1">留空 = 单日日程</p>
            </div>
          </div>

          <div>
            <label class="label">备注</label>
            <textarea v-model="form.notes" class="input h-20" placeholder="可选"></textarea>
          </div>

          <!-- AI source indicator -->
          <div v-if="editingEvent && editingEvent.source === 'ai'" class="p-3 border border-dashed border-stamp-red rounded-card">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono text-stamp-red">AI 建议的日程 — 虚线表示尚未确认</span>
              <button
                @click="confirmAiEvent"
                class="btn btn-primary btn-sm text-xs"
              >确认添加</button>
            </div>
          </div>
        </div>

        <div class="p-5 border-t border-line-soft flex justify-between">
          <div>
            <button v-if="editingEvent" @click="deleteEvent" class="btn btn-danger btn-sm">删除</button>
          </div>
          <div class="flex space-x-3">
            <button @click="closeModal" class="btn btn-secondary">取消</button>
            <button @click="saveEvent" class="btn btn-primary">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { eventsApi } from '@/api';
import { useDialog } from '@/composables/useDialog';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const dialog = useDialog();

const viewMode = ref('month');
const currentDate = ref(dayjs());
const events = ref([]);
const upcomingEvents = ref([]);
const showModal = ref(false);
const editingEvent = ref(null);
const confirmingIds = ref(new Set());

const form = ref({
  title: '',
  start_date: '',
  end_date: '',
  notes: '',
  source: 'manual',
  color: '#1A1A1A',
});

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const currentTitle = computed(() => {
  if (viewMode.value === 'month') return currentDate.value.format('YYYY年M月');
  const s = currentDate.value.startOf('week');
  const e = currentDate.value.endOf('week');
  return `${s.format('M月D日')} - ${e.format('M月D日')}`;
});

// 判断某个事件是否覆盖某一天
const eventCoversDate = (event, ds) => {
  const start = dayjs(event.start_time).format('YYYY-MM-DD');
  // end_time 存在则用 end_time，否则等于 start_time（单日事件）
  const end = event.end_time ? dayjs(event.end_time).format('YYYY-MM-DD') : start;
  return ds >= start && ds <= end;
};

const calendarDays = computed(() => {
  const start = currentDate.value.startOf('month').startOf('week');
  const end = currentDate.value.endOf('month').endOf('week');
  const days = [];
  let cur = start;
  while (cur.isBefore(end) || cur.isSame(end, 'day')) {
    const ds = cur.format('YYYY-MM-DD');
    days.push({
      date: ds,
      day: cur.date(),
      isCurrentMonth: cur.month() === currentDate.value.month(),
      isToday: cur.isSame(dayjs(), 'day'),
      events: events.value.filter(e => eventCoversDate(e, ds)),
    });
    cur = cur.add(1, 'day');
  }
  return days;
});

const weekViewDays = computed(() => {
  const s = currentDate.value.startOf('week');
  return Array.from({ length: 7 }, (_, i) => {
    const d = s.add(i, 'day');
    return { date: d.format('YYYY-MM-DD'), day: d.date(), weekday: weekDays[d.day()], isToday: d.isSame(dayjs(), 'day') };
  });
});

const getEventsForDate = (date) => {
  return events.value.filter(e => eventCoversDate(e, date));
};

const loadEvents = async () => {
  try {
    let s, e;
    if (viewMode.value === 'month') {
      s = currentDate.value.startOf('month').startOf('week').format('YYYY-MM-DD');
      e = currentDate.value.endOf('month').endOf('week').format('YYYY-MM-DD');
    } else {
      s = currentDate.value.startOf('week').format('YYYY-MM-DD');
      e = currentDate.value.endOf('week').format('YYYY-MM-DD');
    }
    const r = await eventsApi.list({ start: s, end: e });
    if (r.success) events.value = r.data;
  } catch (err) { console.error(err); }
};

const loadUpcomingEvents = async () => {
  try {
    const r = await eventsApi.upcoming();
    if (r.success) upcomingEvents.value = r.data;
  } catch (err) { console.error(err); }
};

const goToPrev = () => {
  currentDate.value = viewMode.value === 'month'
    ? currentDate.value.subtract(1, 'month')
    : currentDate.value.subtract(1, 'week');
};
const goToNext = () => {
  currentDate.value = viewMode.value === 'month'
    ? currentDate.value.add(1, 'month')
    : currentDate.value.add(1, 'week');
};
const goToToday = () => { currentDate.value = dayjs(); };

const openCreateModal = (date) => {
  editingEvent.value = null;
  const d = date || dayjs().format('YYYY-MM-DD');
  form.value = {
    title: '',
    start_date: d,
    end_date: '',
    notes: '',
    source: 'manual',
    color: '#1A1A1A',
  };
  showModal.value = true;
};

const editEvent = (event) => {
  editingEvent.value = event;
  form.value = {
    title: event.title,
    start_date: dayjs(event.start_time).format('YYYY-MM-DD'),
    end_date: event.end_time ? dayjs(event.end_time).format('YYYY-MM-DD') : '',
    notes: event.notes || '',
    source: event.source,
    color: event.color || '#1A1A1A',
  };
  showModal.value = true;
};

const closeModal = () => { showModal.value = false; editingEvent.value = null; };

const saveEvent = async () => {
  if (!form.value.title || !form.value.start_date) {
    await dialog.alert('请填写标题和开始日期');
    return;
  }

  // 防呆：结束日期早于开始日期时自动交换
  if (form.value.end_date && form.value.end_date < form.value.start_date) {
    const tmp = form.value.start_date;
    form.value.start_date = form.value.end_date;
    form.value.end_date = tmp;
  }

  const startDate = form.value.start_date;
  const endDate = form.value.end_date || null;

  const data = {
    title: form.value.title,
    start_time: new Date(startDate + 'T00:00:00').toISOString(),
    end_time: endDate ? new Date(endDate + 'T23:59:59').toISOString() : null,
    all_day: 1,
    notes: form.value.notes,
    source: form.value.source,
    color: form.value.color,
  };

  try {
    if (editingEvent.value) await eventsApi.update(editingEvent.value.id, data);
    else await eventsApi.create(data);
    closeModal();
    loadEvents();
    loadUpcomingEvents();
  } catch (e) { await dialog.alert('保存失败: ' + e.message); }
};

const deleteEvent = async () => {
  if (!await dialog.confirm('确定删除这个日程吗？')) return;
  try {
    await eventsApi.delete(editingEvent.value.id);
    closeModal();
    loadEvents();
    loadUpcomingEvents();
  } catch (e) { await dialog.alert('删除失败: ' + e.message); }
};

// 切换完成状态
const toggleComplete = async (event) => {
  try {
    const r = await eventsApi.toggleComplete(event.id);
    if (r.success) {
      // 更新本地数据
      const idx = events.value.findIndex(e => e.id === event.id);
      if (idx !== -1) events.value[idx] = r.data;
    }
  } catch (e) { console.error('切换完成状态失败:', e); }
};

// Confirm AI event: trigger animation, then update source to manual
const confirmAiEvent = async () => {
  if (!editingEvent.value) return;
  const eventId = editingEvent.value.id;

  // Add to confirming set to trigger CSS animation
  confirmingIds.value = new Set([...confirmingIds.value, eventId]);

  // After animation completes, update the event source
  setTimeout(async () => {
    try {
      await eventsApi.update(eventId, { ...form.value, source: 'manual' });
      // Remove from confirming set
      const newSet = new Set(confirmingIds.value);
      newSet.delete(eventId);
      confirmingIds.value = newSet;
      closeModal();
      loadEvents();
    } catch (e) { await dialog.alert('确认失败: ' + e.message); }
  }, 400);
};

watch(viewMode, () => loadEvents());
watch(currentDate, () => loadEvents());

onMounted(() => { loadEvents(); loadUpcomingEvents(); });
</script>
