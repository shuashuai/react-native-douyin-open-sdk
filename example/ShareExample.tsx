import React, { useState } from 'react'
import { Button, ScrollView, Text, TextInput } from 'react-native'
import Douyin from 'react-native-douyin-open-sdk'

/** Copy into a separately created RN host after installing this SDK. No downloader or permission prompts are included. */
export default function ShareExample() {
  const [key, setKey] = useState('')
  const [uri, setUri] = useState('file:///')
  const [url, setUrl] = useState('https://')
  const [log, setLog] = useState('')
  const run = async (task: () => Promise<unknown>) => {
    try { setLog(JSON.stringify(await task(), null, 2) ?? 'done') }
    catch (e) { setLog(`${(e as { code?: string }).code ?? ''}: ${String(e)}`) }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text>Use your own registered clientKey, signing configuration, and approved sharing URL.</Text>
      <TextInput value={key} onChangeText={setKey} placeholder="clientKey" />
      <Button title="Configure after consent" onPress={() => run(() => Douyin.configure({ clientKey: key }))} />
      <Button title="Capabilities" onPress={() => run(() => Douyin.getCapabilities())} />
      <Text>Grant Photos permission in the host BEFORE preparing an iOS file. Imported images stay in Photos.</Text>
      <TextInput value={uri} onChangeText={setUri} placeholder="file:///local/image.jpg" />
      <Button title="Prepare image and share work" onPress={() => run(async () => {
        const resources = await Douyin.prepareResources([{ type: 'file', uri }], { mediaType: 'image', allowPhotoLibraryWrite: true })
        return Douyin.share({ mediaType: 'image', resources, targetPage: 'edit' })
      })} />
      <Button title="Prepare image and share to contacts" onPress={() => run(async () => {
        const resources = await Douyin.prepareResources([{ type: 'file', uri }], { mediaType: 'image', allowPhotoLibraryWrite: true })
        return Douyin.shareToContacts({ mediaType: 'image', resources })
      })} />
      <TextInput value={url} onChangeText={setUrl} placeholder="Verified HTTPS share URL" />
      <Button title="Share contact link" onPress={() => run(() => Douyin.shareToContacts({ mediaType: 'link', link: { url, title: 'Example', description: 'Open example link' } }))} />
      <Button title="Stop waiting locally" onPress={() => run(() => Douyin.cancelPendingShare())} />
      <Text selectable>{log}</Text>
    </ScrollView>
  )
}
