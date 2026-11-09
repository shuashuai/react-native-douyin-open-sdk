import { NativeModules } from 'react-native'
import { createDouyin, DouyinError } from './core'
import type { NativeBridge } from './types'
export * from './types'
export { DouyinError }
const bridge = new Proxy({} as NativeBridge, {
  get(_target, method) {
    return (...args: unknown[]) => {
      const native = NativeModules.RNDouyinOpenSDK
      if (!native || typeof native[method] !== 'function') return Promise.reject(new DouyinError('E_NOT_LINKED', 'Native module unavailable; install pods and rebuild the App'))
      return native[method](...args)
    }
  },
})
export const Douyin = createDouyin(bridge)
export default Douyin
