<template>
  <span
    class="truncate inline-block"
    :class="className"
    :title="title || text"
    :style="{ maxWidth: maxWidth }"
  >{{ text }}</span>
</template>

<script setup>
const props = defineProps({
  text: { type: String, default: '' },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '' },
  className: { type: String, default: '' },
});
</script>
