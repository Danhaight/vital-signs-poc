<script setup lang="ts">
import { CATEGORIES } from '../../data/types'
import type { ClientData, CategoryKey } from '../../data/types'
import CategoryPanel from './CategoryPanel.vue'

const props = defineProps<{
  data: ClientData
}>()

const emit = defineEmits<{
  selectCategory: [key: CategoryKey]
}>()
</script>

<template>
  <div>
    <div class="grid grid-cols-5 gap-3 stagger-children">
      <CategoryPanel
        v-for="cat in CATEGORIES"
        :key="cat.key"
        :category-key="cat.key"
        :years="data.years"
        :config="data.config"
        :trend="data.trends[cat.key]"
        @select="(key) => emit('selectCategory', key)"
      />
    </div>
  </div>
</template>
