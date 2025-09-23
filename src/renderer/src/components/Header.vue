<script lang="ts" setup>
import logo from '@renderer/assets/logo.png'

const maximizeWindow = (): void => {
  window.electron.ipcRenderer.send('window-maximize')
}
const minimizeWindow = (): void => {
  window.electron.ipcRenderer.send('window-minimize')
}
const closeWindow = (): void => {
  window.electron.ipcRenderer.send('window-close')
}
</script>

<template>
  <header class="header">
    <div class="applogo">
      <div class="applogo-icon">
        <img :src="logo" width="100%" />
      </div>
      <h1>PokemonGoGo</h1>
      <span class="applogo-badge">beta</span>
    </div>
    <div v-if="$route.path.includes('/app')" class="breadcrumbs">
      <i class="fa fa-home" /> >
      <span class="active"></span>
    </div>
    <div class="buttons">
      <button @click="minimizeWindow">
        <i class="fa-solid fa-window-minimize"></i>
      </button>
      <button @click="maximizeWindow">
        <i class="fa-solid fa-window-maximize" />
      </button>
      <button class="red" @click="closeWindow">
        <i class="fa-solid fa-xmark fa-xl"></i>
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
  background: transparent;
  border: none;
  color: white;
  width: 50px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-app-region: no-drag;
  transition: background 0.1s ease-in-out;
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

.breadcrumbs {
  color: #575b69;

  user-select: none;
  -webkit-app-region: no-drag;
  text-transform: capitalize;
}

.breadcrumbs > i:hover {
  cursor: pointer;
  color: white;
}

.breadcrumbs > .active:hover {
  cursor: pointer;
  text-decoration: underline;
}
</style>
