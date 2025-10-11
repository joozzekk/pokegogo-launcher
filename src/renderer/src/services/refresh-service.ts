export const refreshMicrosoftToken = async (token): Promise<void> => {
  const { refreshToken, mcToken } = await window.electron?.ipcRenderer?.invoke(
    'auth:refresh-token',
    token
  )

  console.log('RefreshToken: ', refreshToken)
  console.log('MCToken Data: ', JSON.parse(mcToken))
  localStorage.setItem('token', refreshToken)
  localStorage.setItem('mcToken', mcToken)
}
