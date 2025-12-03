import { updatePreset } from '@primeuix/themes'

export const rose = {
  name: 'rose',
  primary: '#ff69b4', // intensywny różowy
  primaryDark: '#b1396e', // ciemniejszy odcień różowego
  primaryLight: '#ffb6d9', // jasny pastelowy róż
  bgDark: '#2a001a', // ciemny fioletowo-różowy jako tło
  bgCard: '#5a294620', // półprzezroczysty ciemny róż
  bgLight: '#5a2946', // ciemny różowy
  bgBody: '#000000ff',
  textPrimary: '#fff0f6', // bardzo jasny róż, prawie biały
  textSecondary: '#d8a1c4', // delikatny różowo-szary
  border: 'rgba(255, 105, 180, 0.15)', // półprzezroczysty róż
  border2: '#ff69b447',
  newsItem: 'rgba(255, 105, 180, 0.03)', // bardzo delikatny róż
  newsItemHover: 'rgba(255, 105, 180, 0.1)',
  btnHover: '#ff69b43d',
  banBtn: 'rgba(255, 0, 0, 0.3)',
  banBtnText: '#b83232',
  headerBg: 'linear-gradient(180deg, rgba(42, 0, 26, 0.95) 0%, rgba(42, 0, 26, 0.8) 100%)',
  gradientPrimary: 'linear-gradient(135deg, #b1396e 0%, #ff69b4 100%)',
  gradientBanned: 'linear-gradient(135deg, #c5223d 0%, #b91035 100%)',
  shadowGlow: '0 0 15px rgba(255, 105, 180, 0.3)',
  btnGlow: 'rgba(255, 255, 255, 0.2)',
  bgPrimary: '#2a001a',
  bgInput: 'rgba(95, 26, 50, 0.8)',
  textSecondaryAlt: '#b4b4b8',
  textMuted: '#6b6b73',
  borderPrimary: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  borderRadiusSmall: '8px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  shadowCard: '0 20px 40px rgba(42, 0, 26, 0.3)',
  playerLogout: 'rgb(62, 59, 73)',
  statusPulse: 'rgba(255, 105, 180, 0.5)',
  navIcon: 'rgba(255, 105, 180, 0.05)',
  tagDark: '#2a001a80',
  navItem: 'rgba(255, 105, 180, 0.1)',
  navItemHoverNavIcon: 'rgba(255, 105, 180, 0.2)',
  navItemActive: 'rgba(255, 105, 180, 0.15)',
  loginTabBtnBg: 'rgba(73, 48, 63, 0.568)',
  loginTabBtnHover: 'rgba(73, 48, 63, 0.768)',
  errorMessage: '#ff4757',
  loginInvalidBg: 'rgba(255, 71, 87, 0.1)',
  loginInvalidBorder: 'rgba(255, 71, 87, 0.3)',
  gradientOverlay: `
    radial-gradient(circle at 20% 50%, rgba(255, 105, 180, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(240, 100, 160, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 40% 20%, rgba(255, 180, 210, 0.03) 0%, transparent 50%)
    `,
  btnMicrosoft: 'linear-gradient(90deg, #ff69b465, #b1396e)',
  toastError: '#ff4757',
  toastWarning: '#ff69b4',
  loadingOverlay: 'rgba(42, 0, 26, 0.9)',
  footerHover: 'rgba(255, 105, 180, 0.05)',
  shopItem: `linear-gradient(180deg, var(--btn-hover) 0%, transparent 100%)`,
  breadcrumbsText: '#d5a3c7'
}

export const violet = {
  name: 'violet',
  primary: '#b269ff', // ciepły fiolet zamiast pomarańczowego
  primaryDark: '#7a3fb8', // ciemny fiolet
  primaryLight: '#d7baff', // jasny, pastelowy fiolet
  bgDark: '#1a001a', // bardzo ciemny fiolet zamiast czerni
  bgCard: '#3b294620', // półprzezroczysty ciemny fiolet
  bgLight: '#3b2946', // ciemny fiolet
  bgBody: '#000000ff', // ciemny fiolet
  textPrimary: '#f5e6ff', // jasnoróżowy fiolet, żeby tekst dobrze się czytał
  textSecondary: '#c1a8e4', // delikatny fioletowo-szary
  border: 'rgba(178, 105, 255, 0.15)', // półprzezroczysty fiolet
  border2: '#b269ff47',
  newsItem: 'rgba(138, 77, 208, 0.03)', // bardzo delikatny fiolet
  newsItemHover: 'rgba(138, 77, 208, 0.1)',
  btnHover: '#b269ff3d',
  banBtn: 'rgba(255, 0, 0, 0.3)', // pozostawiamy czerwony dla przycisku ban
  banBtnText: '#b83232',
  headerBg: 'linear-gradient(180deg, rgba(26, 0, 26, 0.45) 0%, rgba(26, 0, 26, 0.4) 100%)',
  gradientPrimary: 'linear-gradient(135deg, #7a3fb8 0%, #b269ff 100%)',
  gradientBanned: 'linear-gradient(135deg, #c5223d 0%, #b91035 100%)', // pozostawiamy czerwony gradient dla banów
  shadowGlow: '0 0 15px rgba(178, 105, 255, 0.3)',
  btnGlow: 'rgba(255, 255, 255, 0.2)',
  bgPrimary: '#1a001a',
  bgInput: 'rgba(50, 26, 50, 0.8)',
  textSecondaryAlt: '#b4b4b8',
  textMuted: '#6b6b73',
  borderPrimary: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  borderRadiusSmall: '8px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  shadowCard: '0 20px 40px rgba(26, 0, 26, 0.3)',
  playerLogout: 'rgb(62, 59, 73)',
  statusPulse: 'rgba(142, 84, 199, 0.5)',
  navIcon: 'rgba(178, 105, 255, 0.05)',
  tagDark: '#1a001a80',
  navItem: 'rgba(178, 105, 255, 0.1)',
  navItemHoverNavIcon: 'rgba(178, 105, 255, 0.2)',
  navItemActive: 'rgba(178, 105, 255, 0.15)',
  loginTabBtnBg: 'rgba(51, 48, 63, 0.568)',
  loginTabBtnHover: 'rgba(51, 48, 63, 0.768)',
  errorMessage: '#ff4757',
  loginInvalidBg: 'rgba(255, 71, 87, 0.1)',
  loginInvalidBorder: 'rgba(255, 71, 87, 0.3)',
  gradientOverlay: `
    radial-gradient(circle at 20% 50%, rgba(178, 105, 255, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(140, 100, 210, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 40% 20%, rgba(200, 160, 250, 0.03) 0%, transparent 50%)
    `,
  btnMicrosoft: 'linear-gradient(90deg, #b769ff65, #7a3fb8)',
  toastError: '#ff4757',
  toastWarning: '#b269ff',
  loadingOverlay: 'rgba(26, 0, 26, 0.9)',
  footerHover: 'rgba(178, 105, 255, 0.05)',
  shopItem: `linear-gradient(180deg, var(--btn-hover) 0%, transparent 100%)`,
  breadcrumbsText: '#a59adb'
}

export const grayscale = {
  name: 'grayscale',
  primary: '#b0b0b0', // neutralny szary podstawowy
  primaryDark: '#6e6e6e', // ciemniejszy odcień szarości
  primaryLight: '#d9d9d9', // jasny pastelowy szary
  bgDark: '#1a1a1a', // bardzo ciemny szary prawie czarny
  bgCard: '#4a4a4a20', // półprzezroczysty ciemny szary
  bgLight: '#4a4a4a', // ciemny szary
  bgBody: '#000000ff', // ciemny szary
  textPrimary: '#f0f0f0', // jasny szary do tekstu
  textSecondary: '#b8b8b8', // delikatny szary
  border: 'rgba(176, 176, 176, 0.15)', // półprzezroczysty szary
  border2: '#6e6e6e7a',
  newsItem: 'rgba(176, 176, 176, 0.03)', // delikatny, bardzo jasny szary
  newsItemHover: 'rgba(176, 176, 176, 0.1)',
  btnHover: '#6e6e6e3d',
  banBtn: 'rgba(255, 0, 0, 0.3)', // czerwony pozostaje dla wyjątków
  banBtnText: '#b83232',
  headerBg: 'linear-gradient(180deg, rgba(26, 26, 26, 0.95) 0%, rgba(26, 26, 26, 0.8) 100%)',
  gradientPrimary: 'linear-gradient(135deg, #6e6e6e 0%, #b0b0b0 100%)',
  gradientBanned: 'linear-gradient(135deg, #c5223d 0%, #b91035 100%)',
  shadowGlow: '0 0 15px rgba(176, 176, 176, 0.3)',
  btnGlow: 'rgba(255, 255, 255, 0.2)',
  bgPrimary: '#1a1a1a',
  bgInput: 'rgba(69, 69, 69, 0.8)',
  textSecondaryAlt: '#b4b4b8',
  textMuted: '#6b6b73',
  borderPrimary: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  borderRadiusSmall: '8px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  shadowCard: '0 20px 40px rgba(26, 26, 26, 0.3)',
  playerLogout: 'rgb(62, 59, 73)',
  statusPulse: 'rgba(176, 176, 176, 0.5)',
  navIcon: 'rgba(176, 176, 176, 0.05)',
  tagDark: '#1a1a1a80',
  navItem: 'rgba(176, 176, 176, 0.1)',
  navItemHoverNavIcon: 'rgba(176, 176, 176, 0.2)',
  navItemActive: 'rgba(176, 176, 176, 0.15)',
  loginTabBtnBg: 'rgba(69, 69, 69, 0.568)',
  loginTabBtnHover: 'rgba(69, 69, 69, 0.768)',
  errorMessage: '#ff4757',
  loginInvalidBg: 'rgba(255, 71, 87, 0.1)',
  loginInvalidBorder: 'rgba(255, 71, 87, 0.3)',
  gradientOverlay: `radial-gradient(circle at 20% 50%, rgba(176, 176, 176, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(160, 160, 160, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 20%, rgba(210, 210, 210, 0.03) 0%, transparent 50%)`,
  btnMicrosoft: 'linear-gradient(90deg, #6b6b73, #6e6e6e)',
  toastError: '#ff4757',
  toastWarning: '#b0b0b0',
  loadingOverlay: 'rgba(26, 26, 26, 0.9)',
  footerHover: 'rgba(176, 176, 176, 0.05)',
  shopItem: `linear-gradient(180deg, var(--btn-hover) 0%, transparent 100%)`,
  breadcrumbsText: '#a5a5a5'
}

export const blue = {
  name: 'blue',
  primary: '#3a7bd5', // intensywny niebieski
  primaryDark: '#1f4d8a', // ciemny, chłodny niebieski
  primaryLight: '#a8c6ff', // jasny pastelowy niebieski
  bgDark: '#0d1b2a', // bardzo ciemny niebieski, prawie czarny
  bgCard: '#27406020', // półprzezroczysty ciemny niebieski
  bgLight: '#274060', // ciemny niebieski
  bgBody: '#000000ff', // ciemny niebieski
  textPrimary: '#e6f0ff', // bardzo jasny błękit, prawie biały
  textSecondary: '#9bb4d6', // delikatny niebieskawy szary
  border: 'rgba(58, 123, 213, 0.15)', // półprzezroczysty niebieski
  border2: '#3a7bd547',
  newsItem: 'rgba(58, 123, 213, 0.03)', // bardzo delikatny niebieski
  newsItemHover: 'rgba(58, 123, 213, 0.1)',
  btnHover: '#3a7bd53d',
  banBtn: 'rgba(255, 0, 0, 0.3)', // czerwony dla ostrzeżeń
  banBtnText: '#b83232',
  headerBg: 'linear-gradient(180deg, rgba(13, 27, 42, 0.95) 0%, rgba(13, 27, 42, 0.8) 100%)',
  gradientPrimary: 'linear-gradient(135deg, #1f4d8a 0%, #3a7bd5 100%)',
  gradientBanned: 'linear-gradient(135deg, #c5223d 0%, #b91035 100%)',
  shadowGlow: '0 0 15px rgba(58, 123, 213, 0.3)',
  btnGlow: 'rgba(255, 255, 255, 0.2)',
  bgPrimary: '#0d1b2a',
  bgInput: 'rgba(39, 64, 96, 0.8)',
  textSecondaryAlt: '#a0a8b3',
  textMuted: '#6b6b73',
  borderPrimary: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  borderRadiusSmall: '8px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  shadowCard: '0 20px 40px rgba(13, 27, 42, 0.3)',
  playerLogout: 'rgb(62, 59, 73)',
  statusPulse: 'rgba(58, 123, 213, 0.5)',
  navIcon: 'rgba(58, 123, 213, 0.05)',
  tagDark: '#0d1b2a80',
  navItem: 'rgba(58, 123, 213, 0.1)',
  navItemHoverNavIcon: 'rgba(58, 123, 213, 0.2)',
  navItemActive: 'rgba(58, 123, 213, 0.15)',
  loginTabBtnBg: 'rgba(39, 64, 96, 0.568)',
  loginTabBtnHover: 'rgba(39, 64, 96, 0.768)',
  errorMessage: '#ff4757',
  loginInvalidBg: 'rgba(255, 71, 87, 0.1)',
  loginInvalidBorder: 'rgba(255, 71, 87, 0.3)',
  gradientOverlay: `radial-gradient(circle at 20% 50%, rgba(58, 123, 213, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(52, 102, 177, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 20%, rgba(89, 142, 227, 0.03) 0%, transparent 50%)`,
  btnMicrosoft: 'linear-gradient(90deg, #3a7bd565, #1f4d8a)',
  toastError: '#ff4757',
  toastWarning: '#3a7bd5',
  loadingOverlay: 'rgba(13, 27, 42, 0.9)',
  footerHover: 'rgba(58, 123, 213, 0.05)',
  shopItem: `linear-gradient(180deg, var(--btn-hover) 0%, transparent 100%)`,
  breadcrumbsText: '#7f9ed8'
}

export const green = {
  name: 'green',
  primary: '#32CD32', // limonkowy intensywny zielony
  primaryDark: '#228B22', // ciemny zielony las
  primaryLight: '#98FB98', // jasny pastelowy zielony (PaleGreen)
  bgDark: '#003300', // bardzo ciemny zielony, niemal czarny
  bgCard: '#22662220', // półprzezroczysty ciemny zielony
  bgLight: '#226622', // ciemny zielony
  bgBody: '#000000ff', // ciemny zielony
  textPrimary: '#f0fff0', // bardzo jasny zielony do tekstu
  textSecondary: '#b8d1b8', // delikatny zielonkawy szary
  border: 'rgba(50, 205, 50, 0.15)', // półprzezroczysty zielony
  border2: '#32cd3247',
  newsItem: 'rgba(50, 205, 50, 0.03)', // bardzo delikatny zielony
  newsItemHover: 'rgba(50, 205, 50, 0.1)',
  btnHover: '#32cd323d',
  banBtn: 'rgba(255, 0, 0, 0.3)', // dla banów pozostawiamy czerwony
  banBtnText: '#b83232',
  headerBg: 'linear-gradient(180deg, rgba(0, 51, 0, 0.95) 0%, rgba(0, 51, 0, 0.8) 100%)',
  gradientPrimary: 'linear-gradient(135deg, #228b22 0%, #32cd32 100%)',
  gradientBanned: 'linear-gradient(135deg, #c5223d 0%, #b91035 100%)',
  shadowGlow: '0 0 15px rgba(50, 205, 50, 0.3)',
  btnGlow: 'rgba(255, 255, 255, 0.2)',
  bgPrimary: '#003300',
  bgInput: 'rgba(34, 102, 34, 0.8)',
  textSecondaryAlt: '#a0b0a0',
  textMuted: '#6b6b73',
  borderPrimary: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  borderRadiusSmall: '8px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  shadowCard: '0 20px 40px rgba(0, 51, 0, 0.3)',
  playerLogout: 'rgb(62, 59, 73)',
  statusPulse: 'rgba(50, 205, 50, 0.5)',
  navIcon: 'rgba(50, 205, 50, 0.05)',
  tagDark: '#00330080',
  navItem: 'rgba(50, 205, 50, 0.1)',
  navItemHoverNavIcon: 'rgba(50, 205, 50, 0.2)',
  navItemActive: 'rgba(50, 205, 50, 0.15)',
  loginTabBtnBg: 'rgba(34, 102, 34, 0.568)',
  loginTabBtnHover: 'rgba(34, 102, 34, 0.768)',
  errorMessage: '#ff4757',
  loginInvalidBg: 'rgba(255, 71, 87, 0.1)',
  loginInvalidBorder: 'rgba(255, 71, 87, 0.3)',
  gradientOverlay: `radial-gradient(circle at 20% 50%, rgba(50, 205, 50, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(40, 174, 40, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 20%, rgba(152, 251, 152, 0.03) 0%, transparent 50%)`,
  btnMicrosoft: 'linear-gradient(90deg, #32cd3265, #228b22)',
  toastError: '#ff4757',
  toastWarning: '#32cd32',
  loadingOverlay: 'rgba(0, 51, 0, 0.9)',
  footerHover: 'rgba(50, 205, 50, 0.05)',
  shopItem: `linear-gradient(180deg, var(--btn-hover) 0%, transparent 100%)`,
  breadcrumbsText: '#b2d8b2'
}

export const red = {
  name: 'red',
  // Primary Red Palette
  primary: '#FF4500', // intensywny pomarańczowo-czerwony (OrangeRed)
  primaryDark: '#B22222', // ciemny, głęboki czerwony (FireBrick)
  primaryLight: '#FFA07A', // jasny, pastelowy łososiowy (LightSalmon)

  // Backgrounds
  bgDark: '#330000', // bardzo ciemny czerwony, niemal czarny
  bgCard: '#66222220', // półprzezroczysty ciemny czerwony
  bgLight: '#662222', // ciemny czerwony
  bgBody: '#000000ff', // Ciemne tło (czarne dla kontrastu)
  bgPrimary: '#330000',
  bgInput: 'rgba(102, 34, 34, 0.8)',
  loadingOverlay: 'rgba(51, 0, 0, 0.9)',

  // Text Colors
  textPrimary: '#fff0f0', // bardzo jasny, lekko czerwonawy do tekstu
  textSecondary: '#d1b8b8', // delikatny czerwonawo szary
  textSecondaryAlt: '#b0a0a0',
  textMuted: '#736b6b',
  breadcrumbsText: '#d8b2b2',
  errorMessage: '#ff4757', // Zostawiamy standardową czerwień na błędy

  // Borders & Divi ders
  border: 'rgba(255, 69, 0, 0.15)', // półprzezroczysty OrangeRed
  border2: '#ff450047',
  borderPrimary: 'rgba(255, 255, 255, 0.1)',

  // UI Elements
  newsItem: 'rgba(255, 69, 0, 0.03)', // bardzo delikatny czerwony
  newsItemHover: 'rgba(255, 69, 0, 0.1)',
  btnHover: '#ff45003d',
  btnGlow: 'rgba(255, 255, 255, 0.2)',
  footerHover: 'rgba(255, 69, 0, 0.05)',
  shopItem: `linear-gradient(180deg, var(--btn-hover) 0%, transparent 100%)`,

  // Special/Accent Colors (e.g., Ban/Error)
  banBtn: 'rgba(255, 69, 0, 0.3)', // Teraz używamy OrangeRed
  banBtnText: '#ff4500',
  statusPulse: 'rgba(255, 69, 0, 0.5)',
  toastError: '#ff4757',
  toastWarning: '#FF4500', // Warning dostaje primary red

  // Navigation
  navIcon: 'rgba(255, 69, 0, 0.05)',
  tagDark: '#33000080',
  navItem: 'rgba(255, 69, 0, 0.1)',
  navItemHoverNavIcon: 'rgba(255, 69, 0, 0.2)',
  navItemActive: 'rgba(255, 69, 0, 0.15)',

  // Login/Form
  loginTabBtnBg: 'rgba(102, 34, 34, 0.568)',
  loginTabBtnHover: 'rgba(102, 34, 34, 0.768)',
  loginInvalidBg: 'rgba(255, 71, 87, 0.1)',
  loginInvalidBorder: 'rgba(255, 71, 87, 0.3)',
  btnMicrosoft: 'linear-gradient(90deg, #ff450065, #b22222)', // Gradient z nowymi czerwieniami
  playerLogout: 'rgb(73, 59, 62)', // Przyciemniony, by pasował

  // Effects & Utilities
  headerBg: 'linear-gradient(180deg, rgba(51, 0, 0, 0.45) 0%, rgba(51, 0, 0, 0.4) 100%)',
  gradientPrimary: 'linear-gradient(135deg, #b22222 0%, #ff4500 100%)',
  gradientBanned: 'linear-gradient(135deg, #c5223d 0%, #b91035 100%)', // Zostawiamy intensywną czerwień
  shadowGlow: '0 0 15px rgba(255, 69, 0, 0.3)',
  shadowCard: '0 20px 40px rgba(51, 0, 0, 0.3)',
  gradientOverlay: `radial-gradient(circle at 20% 50%, rgba(255, 69, 0, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(178, 34, 34, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 20%, rgba(255, 160, 122, 0.03) 0%, transparent 50%)`,

  // Static Properties
  borderRadius: '12px',
  borderRadiusSmall: '8px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

export const main = {
  name: 'main',
  // Primary Accent Palette (Icy Blue)
  primary: '#00DFFF', // Czysty Lodowy Błękit (akcent interaktywny)
  primaryShop: '#00DFFF50', // Czysty Lodowy Błękit (akcent interaktywny)
  primaryDark: '#0099CC',
  primaryLight: '#E0FFFF', // Icy Off-White

  // Backgrounds (Deep Dark - bez zmian)
  bgDark: '#0D111740',
  bgCard: 'rgba(22, 27, 34, 0.3)',
  bgLight: '#161B22',
  bgBody: '#0D1117',
  bgPrimary: '#0D1117',
  bgInput: 'rgba(22, 27, 34, 0.8)',
  loadingOverlay: 'rgba(0, 0, 0, 0.95)',

  // Text Colors (Czysta Biel)
  textPrimary: '#FFFFFF', // Czysta Biel
  textSecondary: '#F0F8FF', // Icy Off-White
  textSecondaryAlt: '#B3D4F5',
  textMuted: '#8B949E',
  breadcrumbsText: '#F0F8FF',
  errorMessage: '#FF6B6B',

  // Borders & Dividers (Wzmocniona Biel)
  border: 'rgba(255, 255, 255, 0.04)', // Mocna Półprzezroczysta Biel
  border2: 'rgba(255, 255, 255, 0.04)',
  borderPrimary: 'rgba(255, 255, 255, 0.04)',

  // UI Elements (Białe akcenty)
  newsItem: 'rgba(255, 255, 255, 0.05)',
  newsItemHover: 'rgba(255, 255, 255, 0.05)',
  btnHover: 'rgba(255, 255, 255, 0.1)', // Biały hover
  btnGlow: 'rgba(255, 255, 255, 0.15)', // Biała poświata
  footerHover: 'rgba(255, 255, 255, 0.1)',
  shopItem: `linear-gradient(180deg, var(--primary-shop) 0%, transparent 100%)`,

  // Special/Accent Colors
  banBtn: 'rgba(255, 255, 255, 0.15)',
  banBtnText: '#FF6B6B',
  statusPulse: 'rgba(255, 255, 255, 1.0)', // Czysta Biała
  toastError: '#FF6B6B',
  toastWarning: '#FFD700',

  // Navigation
  navIcon: 'rgba(255, 255, 255, 0.05)', // Białe ikony
  tagDark: '#0D111780',
  navItem: 'rgba(255, 255, 255, 0.1)', // Białe tło elementu
  navItemHoverNavIcon: 'rgba(255, 255, 255, 0.1)',
  navItemActive: 'rgba(255, 255, 255, 0.1)',

  // Login/Form
  loginTabBtnBg: 'rgba(255, 255, 255, 0.15)', // Białe przezroczyste tło
  loginTabBtnHover: 'rgba(255, 255, 255, 0.3)',
  loginInvalidBg: 'rgba(255, 107, 107, 0.1)',
  loginInvalidBorder: 'rgba(255, 107, 107, 0.3)',
  btnMicrosoft: 'linear-gradient(90deg, #00DFFF65, #0099CC)',
  playerLogout: '#3A475C',

  // Effects & Utilities
  headerBg: 'linear-gradient(180deg, rgba(13, 17, 23, 0.5) 0%, rgba(13, 17, 23, 0.45) 100%)',
  gradientPrimary: 'linear-gradient(135deg, #0099CC 0%, #00DFFF 100%)',
  gradientBanned: 'linear-gradient(135deg, #00DFFF 0%, #0099CC 100%)',
  shadowGlow: '0 0 20px rgba(255, 255, 255, 0.6)', // Silna biała poświata szronu
  shadowCard: '0 20px 40px rgba(0, 0, 0, 0.5)',
  gradientOverlay: `radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0, 223, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%)`,

  // Static Properties (bez zmian)
  borderRadius: '12px',
  borderRadiusSmall: '8px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

export const themes = [main, red, blue, green, violet, rose, grayscale]

export function applyTheme(newTheme: string): void {
  const theme = themes.find((t) => t.name.toLowerCase() === newTheme?.toLowerCase()) || main

  const root = document.documentElement
  Object.entries(theme).forEach(([key, value]: [string, string]) => {
    root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
  })

  updatePreset({
    semantic: {
      primary: {
        0: theme.primary,
        50: theme.primary,
        100: theme.primary,
        200: theme.primary,
        300: theme.primary,
        400: theme.primary,
        500: theme.primary,
        600: theme.primary,
        700: theme.primary,
        800: theme.primary,
        900: theme.primary,
        950: theme.primary
      },
      colorScheme: {
        light: {
          surface: {
            0: theme.bgLight,
            50: theme.bgLight,
            100: theme.textSecondary,
            200: theme.textSecondary,
            300: theme.textSecondary,
            400: theme.textSecondary,
            500: theme.textSecondary,
            600: theme.textSecondary,
            700: theme.textSecondary,
            800: theme.bgLight,
            900: theme.bgLight,
            950: theme.bgLight
          },
          semantic: {
            highlight: {
              background: theme.primary,
              color: theme.textPrimary
            }
          }
        }
      }
    }
  })
}
