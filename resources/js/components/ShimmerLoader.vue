<template>
  <!-- ── Dashboard ── -->
  <div v-if="variant === 'dashboard'">
    <!-- Stat cards -->
    <div class="row g-3 mb-4">
      <div v-for="i in 4" :key="i" class="col-6 col-md-3">
        <div class="fl-card p-3">
          <div class="d-flex align-items-center gap-3">
            <div class="shimmer shimmer-block" style="width:48px;height:48px;border-radius:14px;flex-shrink:0" />
            <div class="flex-grow-1">
              <div class="shimmer shimmer-line mb-2" style="width:60%;height:12px" />
              <div class="shimmer shimmer-line" style="width:40%;height:20px" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Two-col content -->
    <div class="row g-3">
      <div class="col-12 col-lg-8">
        <div class="fl-card p-3">
          <div class="shimmer shimmer-line mb-3" style="width:180px;height:16px" />
          <div v-for="j in 5" :key="j" class="d-flex align-items-center gap-3 mb-3">
            <div class="shimmer shimmer-block" style="width:36px;height:36px;border-radius:10px;flex-shrink:0" />
            <div class="flex-grow-1">
              <div class="shimmer shimmer-line mb-1" :style="`width:${55+j*6}%;height:12px`" />
              <div class="shimmer shimmer-line" style="width:30%;height:10px" />
            </div>
            <div class="shimmer shimmer-block" style="width:60px;height:24px;border-radius:20px;flex-shrink:0" />
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-4">
        <div class="fl-card p-3">
          <div class="shimmer shimmer-line mb-3" style="width:120px;height:16px" />
          <div v-for="k in 4" :key="k" class="d-flex justify-content-between align-items-center mb-3">
            <div class="shimmer shimmer-line" style="width:45%;height:12px" />
            <div class="shimmer shimmer-line" style="width:30%;height:12px" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Cards grid (Documents, Bills, Albums, Family) ── -->
  <div v-else-if="variant === 'cards'" class="row g-3">
    <div v-for="i in count" :key="i" :class="colClass">
      <div class="fl-card p-3 h-100">
        <div class="d-flex justify-content-between mb-3">
          <div class="shimmer shimmer-block" style="width:80px;height:22px;border-radius:20px" />
          <div class="shimmer shimmer-block" style="width:28px;height:28px;border-radius:8px" />
        </div>
        <div class="shimmer shimmer-line mb-2" style="width:75%;height:14px" />
        <div class="shimmer shimmer-line mb-2" style="width:50%;height:12px" />
        <div class="shimmer shimmer-line" style="width:65%;height:11px" />
      </div>
    </div>
  </div>

  <!-- ── Members grid ── -->
  <div v-else-if="variant === 'members'" class="row g-3">
    <div v-for="i in count" :key="i" :class="colClass">
      <div class="fl-card p-3">
        <div class="d-flex align-items-center gap-3">
          <div class="shimmer shimmer-block" style="width:52px;height:52px;border-radius:14px;flex-shrink:0" />
          <div class="flex-grow-1">
            <div class="shimmer shimmer-line mb-2" style="width:55%;height:14px" />
            <div class="shimmer shimmer-line mb-2" style="width:75%;height:11px" />
            <div class="d-flex gap-2">
              <div class="shimmer shimmer-block" style="width:64px;height:20px;border-radius:20px" />
              <div class="shimmer shimmer-block" style="width:48px;height:20px;border-radius:20px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Table rows (Expenses, Tasks) ── -->
  <div v-else-if="variant === 'table'">
    <div class="fl-card overflow-hidden">
      <div class="px-3 pt-3 pb-1">
        <div class="shimmer shimmer-line mb-3" style="width:200px;height:16px" />
      </div>
      <table class="table mb-0">
        <thead>
          <tr>
            <th v-for="i in cols" :key="i">
              <div class="shimmer shimmer-line" style="height:12px;width:70%" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in count" :key="i">
            <td v-for="j in cols" :key="j">
              <div class="shimmer shimmer-line" :style="`height:12px;width:${45+j*8}%`" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Photo grid (AlbumDetail) ── -->
  <div v-else-if="variant === 'photos'" class="photo-grid">
    <div v-for="i in count" :key="i" class="photo-item">
      <div class="shimmer shimmer-block w-100 h-100" style="border-radius:var(--fl-radius);aspect-ratio:1/1" />
    </div>
  </div>

  <!-- ── Medical (records / medicines / appointments) ── -->
  <div v-else-if="variant === 'medical'" class="row g-3">
    <div v-for="i in count" :key="i" class="col-12 col-sm-6 col-lg-4">
      <div class="fl-card p-3">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="shimmer shimmer-block" style="width:90px;height:22px;border-radius:20px" />
          <div class="shimmer shimmer-block" style="width:28px;height:28px;border-radius:8px" />
        </div>
        <div class="shimmer shimmer-line mb-2" style="width:70%;height:14px" />
        <div class="shimmer shimmer-line mb-2" style="width:50%;height:11px" />
        <div class="shimmer shimmer-line" style="width:85%;height:11px" />
      </div>
    </div>
  </div>

  <!-- ── Generic fallback ── -->
  <div v-else class="fl-card p-4">
    <div v-for="i in count" :key="i" class="mb-3">
      <div class="shimmer shimmer-line mb-2" :style="`width:${50+i*10}%;height:14px`" />
      <div class="shimmer shimmer-line" style="width:35%;height:11px" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'cards', // dashboard | cards | members | table | photos | medical
  },
  count: {
    type: Number,
    default: 8,
  },
  cols: {
    type: Number,
    default: 5, // for table variant
  },
  colClass: {
    type: String,
    default: 'col-12 col-sm-6 col-lg-4 col-xl-3',
  },
})
</script>
