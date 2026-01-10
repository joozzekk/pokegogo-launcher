import { defineStore } from 'pinia'
import type { IUser } from '@ui/env'
import type { IFriend } from '@ui/stores/chats-store'
import { getProfileByUUIDorNickname } from '@ui/api/endpoints'
import { loadCustomOrFallbackHead } from '@ui/utils'

type WithTime<T> = { at: number; data: T }
const TTL_MS = 5 * 60 * 1000 // 5 minut

export const useUserCacheStore = defineStore('user-cache', () => {
  const usersByUuid = new Map<string, WithTime<IUser>>()
  const usersByNickname = new Map<string, WithTime<IUser>>()
  const friendsByNickname = new Map<string, WithTime<IFriend[]>>()

  const isFresh = (t?: number): boolean => !!t && Date.now() - t < TTL_MS

  function cacheUser(u: IUser): void {
    const wrap = { at: Date.now(), data: u }
    if (u.uuid) usersByUuid.set(u.uuid, wrap)
    if (u.nickname) usersByNickname.set(u.nickname, wrap)
  }

  function getUserByUuid(uuid: string): IUser | undefined {
    const hit = usersByUuid.get(uuid)
    return hit && isFresh(hit.at) ? hit.data : undefined
  }

  function getUserByNickname(nickname: string): IUser | undefined {
    const hit = usersByNickname.get(nickname)
    return hit && isFresh(hit.at) ? hit.data : undefined
  }

  function cacheFriends(nickname: string, list: IFriend[]): void {
    friendsByNickname.set(nickname, { at: Date.now(), data: list })
  }

  function getFriendsCached(nickname: string): IFriend[] | undefined {
    const hit = friendsByNickname.get(nickname)
    return hit && isFresh(hit.at) ? hit.data : undefined
  }

  function invalidateUser(nicknameOrUuid: string): void {
    usersByUuid.delete(nicknameOrUuid)
    usersByNickname.delete(nicknameOrUuid)
  }

  function invalidateFriends(nickname: string): void {
    friendsByNickname.delete(nickname)
  }

  async function getOrFetchUser(opts: { uuid?: string; nickname?: string }): Promise<IUser | null> {
    if (opts.uuid) {
      const c = getUserByUuid(opts.uuid)
      if (c) return c
    }
    if (opts.nickname) {
      const c = getUserByNickname(opts.nickname)
      if (c) return c
    }

    let user: IUser | null = null
    if (opts.uuid) {
      user = await getProfileByUUIDorNickname(opts.uuid)
    } else if (opts.nickname) {
      user = await getProfileByUUIDorNickname(opts.nickname)
    }

    if (!user) return null

    user.headUrl = await loadCustomOrFallbackHead(user)
    cacheUser(user)
    return user
  }

  return {
    cacheUser,
    getUserByUuid,
    getUserByNickname,
    cacheFriends,
    getFriendsCached,
    invalidateUser,
    invalidateFriends,
    getOrFetchUser
  }
})
