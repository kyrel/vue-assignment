<script setup lang="ts">
defineProps<{
    percentageFull: number,
    label: string
}>()
</script>
<template>
    <div class="bar">
        <div class="bar__full" :style="{ width: `${percentageFull.toFixed(1)}%` }">
            <div class="bar__text">
                {{ label }}
            </div>
        </div>
    </div>
</template>

<style scoped>

.bar {
    border-radius: 4px;
    border: 2px solid #bdbdbd;
    background-color: #fff;
    /*height: 20px;*/
}

.bar__full {
    background-color: #b5e9cb;
    overflow: visible;
    transition: width 0.5s ease;
}

.bar__text {
    padding: 0 5px;
    color: #000;
}
</style>