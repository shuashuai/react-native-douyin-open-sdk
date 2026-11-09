# Integration example

ShareExample.tsx is an integration screen, not a preconfigured runnable host. Create an independent React Native 0.83.3 project using the community CLI, install the SDK tarball, follow the root README native steps, then import this screen as App. Use your registered host identity; no AppID or signing key is bundled.

The example deliberately uses local files and an approved HTTPS URL. Host-side Photos permission must be granted before importing a file on iOS. Add a video case by changing prepareResources mediaType and share mediaType to video. Test targetPage edit and publish separately. Never install this screen in a production business page merely for SDK testing.
