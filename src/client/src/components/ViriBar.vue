<script setup lang="ts">
defineProps<{
    percentageFull: number,
    label: string
}>()
</script>
<template>
    <div class="viri-bar">
        <div class="viri-bar__full" :style="{ width: `${percentageFull.toFixed(1)}%` }">
            <div class="viri-bar__text">
                {{ label }}
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
/* @define viri-bar */
.viri-bar {
    border-radius: 4px;
    border: 2px solid var(--color-border);
    background-color: var(--color-background);

    &__full {
        background-color: var(--color-background-fill);
        overflow: visible;
        transition: width 0.5s ease;
    }

    &__text {
        padding: 0 5px;
    }
}
</style>