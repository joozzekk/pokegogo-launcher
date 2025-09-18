<script lang="ts" setup>
import logo from '@renderer/assets/logo.png'

function minimizeWindow(): void {
  window.electron.ipcRenderer.send('window-minimize')
}

function closeWindow(): void {
  window.electron.ipcRenderer.send('window-close')
}
</script>

<template>
  <header class="header">
    <div class="logo">
      <div class="logo-icon">
        <img :src="logo" width="100%" />
      </div>
      <h1>PokemonGoGo</h1>
      <span class="logo-badge">beta</span>
    </div>
    <div class="buttons">
      <button @click="minimizeWindow">
        <i class="fa fa-minimize" />
      </button>
      <button class="red" @click="closeWindow">
        <i class="fa fa-close" />
      </button>
    </div>
  </header>
</template>

<style>
.buttons {
  position: absolute;
  right: 0;
  top: 0;
  display: flex;
  height: 100%;
}

.buttons button {
  width: 50px;
  height: 100%;
  background: transparent;
  border: none;
  color: white;
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-app-region: no-drag;
  transition: background 0.15s ease-in-out;
  border-radius: 4px;
}

.buttons button > i {
  height: 100%;
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.buttons button:hover {
  background: rgba(34, 192, 197, 0.2);
}

.buttons button.red:hover {
  background: rgba(197, 34, 48, 0.4) !important;
}
</style>
