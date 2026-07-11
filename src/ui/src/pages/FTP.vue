<script lang="ts" setup>
import CreateFolderModal from '@ui/components/modals/CreateFolderModal.vue'
import { useFTP } from '@ui/services/ftp-service'
import { format } from 'date-fns'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import useUserStore from '@ui/stores/user-store'
import { UserRole } from '@ui/types/app'
const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()

const {
  searchQuery,
  currentFileName,
  currentFileContent,
  dragActive,
  loadingStatuses,
  createFolderModal,
  inputFile,
  inputFolder,
  filteredFiles,
  breadcrumbs,
  getFolderContent,
  changeFolder,
  restoreFolder,
  uploadFile,
  uploadFolder,
  createFolder,
  removeFile,
  openTextFile,
  openImageFile,
  saveFile,
  downloadFile,
  downloadFolder,
  handleDrop,
  openCreateFolderModal,
  handleUploadFile,
  handleUploadFolder,
  isTextFile,
  isImageFile,
  fileIsImportant,
  toggleImportant,
  handleZipFolder
} = useFTP()

// Satisfy vue-tsc: these are used in template
void createFolderModal
void inputFile
void inputFolder

const dragCounter = ref<number>(0)

const onDragEnter = (): void => {
  dragCounter.value++
  dragActive.value = true
}

const onDragLeave = (): void => {
  dragCounter.value--
  if (dragCounter.value === 0) {
    dragActive.value = false
  }
}

const onDrop = (ev: DragEvent): void => {
  dragCounter.value = 0
  dragActive.value = false
  handleDrop(ev)
}

onMounted(async () => {
  const role = userStore.user?.role?.toLowerCase() ?? UserRole.USER
  const isFullAdmin = [UserRole.OWNER, UserRole.ADMIN, UserRole.DEV, UserRole.DEV_EN].includes(role as UserRole)

  if (!isFullAdmin) {
    router.push('/app/home')
    return
  }
  await getFolderContent()
})
</script>

<template>
  <div class="ftp-layout">
    <div class="ftp-header">
      <div class="search-container">
        <i class="fas fa-search"></i>
        <input v-model="searchQuery" type="text" :placeholder="t('ftp.searchPlaceholder')" />
      </div>

      <div class="actions-dock">
        <button class="action-btn" :title="t('ftp.createFolder')" @click="openCreateFolderModal">
          <i class="fa fa-folder-plus" />
        </button>
        <div class="dock-divider"></div>
        <button class="action-btn" :title="t('ftp.uploadFolder')" @click="handleUploadFolder">
          <i class="fa fa-upload" />
        </button>
        <button class="action-btn" :title="t('ftp.uploadFile')" @click="handleUploadFile">
          <i class="fa fa-file-import" />
        </button>
      </div>
    </div>

    <div
      class="ftp-glass-panel"
      :class="{
        'drag-active': dragActive,
        'overflow-hidden': loadingStatuses
      }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div v-if="loadingStatuses" class="loading-overlay">
        <i class="fa fa-spinner fa-spin"></i>
        <span>{{ t('ftp.loading') }}</span>
      </div>

      <div v-if="dragActive" class="drop-overlay">
        <div class="drop-content">
          <i class="fa fa-cloud-upload-alt"></i>
          <p>{{ t('ftp.dropHint') }}</p>
        </div>
      </div>

      <template v-if="isTextFile(currentFileName)">
        <div class="editor-container">
          <div class="editor-toolbar">
            <span class="file-name">{{ currentFileName }}</span>
            <div class="editor-actions">
              <button class="editor-btn save" @click="saveFile">
                <i class="fa fa-save" /> Save
              </button>
              <button class="editor-btn close" @click="currentFileName = ''">
                <i class="fa fa-times" />
              </button>
            </div>
          </div>
          <textarea
            v-model="currentFileContent"
            class="editor-textarea"
            spellcheck="false"
          ></textarea>
        </div>
      </template>

      <template v-else-if="currentFileContent.length && isImageFile(currentFileName)">
        <div class="preview-container">
          <button class="close-preview-btn" @click="currentFileContent = ''">
            <i class="fa fa-times" />
          </button>
          <img :src="currentFileContent" :alt="currentFileName" />
        </div>
      </template>

      <template v-else>
        <input ref="inputFile" type="file" multiple hidden @change="uploadFile" />
        <input
          ref="inputFolder"
          type="file"
          multiple
          hidden
          directory
          webkitdirectory
          @change="uploadFolder"
        />

        <div class="breadcrumbs-bar">
          <button class="home-btn" @click="restoreFolder('')">
            <i class="fa fa-home" />
          </button>

          <div class="breadcrumbs-list">
            <span v-if="breadcrumbs.length > 0" class="separator">/</span>
            <template v-for="(breadcrumb, i) in breadcrumbs" :key="i">
              <span
                class="breadcrumb-item"
                :class="{ active: i === breadcrumbs.length - 1 }"
                @click="i < breadcrumbs.length - 1 ? restoreFolder(breadcrumb) : null"
              >
                {{ breadcrumb }}
              </span>
              <span v-if="i + 1 !== breadcrumbs.length" class="separator">/</span>
            </template>
          </div>
        </div>

        <div class="files-wrapper custom-scrollbar">
          <template v-if="!filteredFiles.length">
            <div class="empty-state">
              <div class="empty-icon">
                <i class="fa fa-folder-open"></i>
              </div>
              <h2>{{ t('ftp.noFilesTitle') }}</h2>
              <p>{{ t('ftp.noFilesDesc') }}</p>
            </div>
          </template>

          <template v-else>
            <div
              v-for="file in filteredFiles"
              :key="file.name"
              class="file-row"
              :class="{ 'is-directory': file.isDirectory }"
              @click="
                file.isDirectory
                  ? changeFolder(file.name)
                  : isTextFile(file.name)
                    ? openTextFile(file.name)
                    : isImageFile(file.name)
                      ? openImageFile(file.name)
                      : null
              "
            >
              <div class="file-icon">
                <template v-if="file.isDirectory">
                  <i
                    v-if="file.status === 'zipped-dirty'"
                    class="fa fa-box-open text-yellow-500"
                  ></i>
                  <i v-else-if="file.status === 'zipped'" class="fa fa-box text-green-400"></i>
                  <i v-else class="fa fa-folder"></i>
                </template>
                <template v-else>
                  <i
                    v-if="file.name.endsWith('.zip')"
                    class="fa fa-file-archive text-purple-400"
                  ></i>
                  <i v-else-if="isTextFile(file.name)" class="fa fa-file-code text-blue-400"></i>
                  <i v-else-if="isImageFile(file.name)" class="fa fa-file-image text-pink-400"></i>
                  <i v-else class="fa fa-file text-gray-400"></i>
                </template>
              </div>

              <div class="file-info">
                <div class="file-name-wrapper">
                  <span class="file-name">{{ file.name }}</span>
                  <span v-if="file.flag === 'important'" class="badge important">{{
                    t('ftp.flags.important')
                  }}</span>
                  <span v-else-if="file.flag === 'ignore'" class="badge ignore">{{
                    t('ftp.flags.ignored')
                  }}</span>
                </div>
                <span v-if="file.status === 'zipped-dirty'" class="status-warning">{{
                  t('ftp.warnings.zippedDirty')
                }}</span>
              </div>

              <div class="file-meta">
                <span class="file-date">
                  {{ file.modifiedAt ? format(new Date(file.modifiedAt), 'MMM dd HH:mm') : '' }}
                </span>

                <div class="file-actions">
                  <button
                    v-if="file.isDirectory"
                    class="icon-btn"
                    :title="t('ftp.tooltips.zipFolder')"
                    @click.stop="handleZipFolder(file)"
                  >
                    <i class="fa fa-box-open"></i>
                  </button>

                  <button
                    v-if="!file.name.endsWith('.zip')"
                    class="icon-btn star-btn"
                    :class="{ active: fileIsImportant(file) }"
                    @click.stop="toggleImportant(file)"
                  >
                    <i :class="fileIsImportant(file) ? 'fa fa-star' : 'fa-regular fa-star'" />
                  </button>

                  <button
                    class="icon-btn"
                    @click.stop="
                      file.isDirectory ? downloadFolder(file.name) : downloadFile(file.name)
                    "
                  >
                    <i class="fa fa-download"></i>
                  </button>

                  <button class="icon-btn delete-btn" @click.stop="removeFile(file.name)">
                    <i class="fa fa-trash" />
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>

      <CreateFolderModal ref="createFolderModal" @submit="createFolder" />
    </div>
  </div>
</template>

<style scoped>
.ftp-layout {
  width: 100%;
  height: calc(100vh - 60px);
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header Section */
.ftp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

/* Search Bar */
.search-container {
  display: flex;
  align-items: center;
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(10px);
  padding: 0.6rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 300px;
  transition: all 0.3s ease;
}

.search-container:focus-within {
  background: rgba(20, 20, 25, 0.9);
  border-color: rgba(var(--primary-rgb), 0.5);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.2);
}

.search-container i {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-right: 0.8rem;
}

.search-container input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  width: 100%;
  font-size: 0.9rem;
}

.search-container input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

/* Actions Dock */
.actions-dock {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  cursor: pointer;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.dock-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 0.5rem;
}

/* Main Glass Panel */
.ftp-glass-panel {
  flex: 1;
  background: rgba(20, 20, 25, 0.4);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
}

.ftp-glass-panel.drag-active {
  border-color: var(--primary);
  box-shadow: 0 0 30px rgba(var(--primary-rgb), 0.3);
}

/* Breadcrumbs */
.breadcrumbs-bar {
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);
}

.home-btn {
  color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  transition: all 0.2s;
}

.home-btn:hover {
  background: var(--primary);
  color: white;
}

.breadcrumbs-list {
  display: flex;
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
}

.separator {
  margin: 0 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.breadcrumb-item {
  color: var(--text-secondary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: color 0.2s;
}

.breadcrumb-item:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.breadcrumb-item.active {
  color: var(--text-primary);
  font-weight: 600;
  cursor: default;
  text-decoration: none;
}

/* Files Wrapper */
.files-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* File Row Card */
.file-row {
  display: flex;
  align-items: center;
  padding: 0.8rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.02);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.file-row:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(4px);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.file-row.is-directory .file-icon i {
  color: var(--primary);
}

.file-icon {
  width: 40px;
  display: flex;
  justify-content: center;
  font-size: 1.2rem;
  margin-right: 1rem;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.file-name-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-name {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
}

.badge.important {
  background: rgba(var(--primary-rgb), 0.2);
  color: var(--primary);
  border: 1px solid rgba(var(--primary-rgb), 0.3);
}

.badge.ignore {
  background: rgba(100, 100, 100, 0.2);
  color: #aaa;
}

.status-warning {
  font-size: 0.7rem;
  color: #fbbf24;
  margin-top: 2px;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.file-date {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease;
}

.file-row:hover .file-actions {
  opacity: 1;
  transform: translateX(0);
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.star-btn.active {
  color: #fbbf24;
}

.star-btn:hover {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* Empty State */
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.1);
}

.empty-state h2 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

/* Editor & Preview */
.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  padding: 0.8rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.editor-btn {
  padding: 0.4rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.editor-btn.save {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
}

.editor-btn.save:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.editor-btn.close {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.editor-btn.close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  background: transparent;
  color: var(--text-primary);
  border: none;
  padding: 1.5rem;
  font-family: monospace;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  position: relative;
}

.preview-container img {
  max-width: 90%;
  max-height: 90%;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.close-preview-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.close-preview-btn:hover {
  background: rgba(239, 68, 68, 0.8);
  transform: rotate(90deg);
}

/* Overlays */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50;
  color: white;
  gap: 1rem;
  font-size: 1.2rem;
  pointer-events: none;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(var(--primary-rgb), 0.1);
  backdrop-filter: blur(8px);
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--primary);
  border-radius: 24px;
  margin: 1rem;
  pointer-events: none;
}

.drop-content {
  text-align: center;
  color: var(--primary);
}

.drop-content i {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.drop-content p {
  font-size: 1.5rem;
  font-weight: 700;
}
</style>
