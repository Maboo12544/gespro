# GesPro Android test wrapper
Android 7+ (API 24), Internet required. Loads https://gespro.lol with existing GesPro authentication. No configurable server and no payment integration. Browser-local demo data is separate from other browsers/devices.

MainActivity uses the system WebView, native Android print service and a native image share chooser. TicketProvider grants temporary read access only to a generated ticket PNG. No JavaScript interface, no cleartext, no file access, no third-party cookies; navigation restricted to gespro.lol. Errors offer retry. Manufacturer POS printer drivers still require device testing.

Build with Android SDK Platform 35 / Build Tools 35, Java 17 and ECJ 3.38.0. Compile res with aapt2, link manifest with android.jar, compile Java 8 with android.jar + core-lambda-stubs.jar, dex with d8 (min API24), zip classes.dex into linked APK, zipalign then sign with apksigner. Test signing material is retained separately; never commit it. Use a production key for any production release.

Install iPhone web app: open GesPro in Safari, Share > Add to Home Screen. Manifest and Apple icon are provided. No offline sales or service worker caching of authentication/tickets.

Mobile ticket preview includes Share, Print and Close. Share creates a PNG with all played lottery groups, zero-preserving numbers, total and ORIGINAL/COPY marker; Web Share opens installed share targets such as WhatsApp. Unsupported browsers download the PNG instead. Native Android routes the PNG through ACTION_SEND. Actual device/WhatsApp/printer testing remains required.

## Version 1.1-test — printer support

Download: `/downloads/GesPro-Android-1.1-Test.apk`. Same test signing certificate/application ID as 1.0; versionCode 2. Android 7+ with an updated Android System WebView and Internet. This is a test installer, not a production release. Preserve existing app data when updating; do not uninstall to update.

- Native SUNMI binding through `com.sunmi:printerlibrary:1.0.18` (bundled AAR in app/libs, downloaded from Maven Central). Source reference: https://github.com/shangmisunmi/SunmiPrinterDemo and https://file.cdn.sunmi.com/SUNMIDOCS/SunmiPrinter-Developer-Docs-1-1.pdf.
- When a service is connected, Print offers SUNMI 58 mm or Other printer/PDF. State is checked before sending. The already-rendered receipt is scaled to 384 dots and submitted in 256-row strips. All lottery groups and original/copy labels remain part of the image. No automatic retry after errors; partial output must be checked manually. The submission message is not proof of physical completion.
- Maximum direct receipt canvas height 16000 pixels, encoded payload 4 MB. Larger/unavailable images show an error and can use Android's print service instead.
- Other manufacturers use their installed Android Print Service. A proprietary built-in printer without such a service still requires its manufacturer's SDK; do not claim universal direct printing.
- Configuration includes an Android printer-settings shortcut, and website receipt widths 58/80 mm or A4/Letter. Desktop printing uses the browser/OS selection dialog; the website cannot enumerate OS printers or confirm paper output.
- Android print jobs are tracked to avoid starting a second system job while the first is unresolved.
- No physical SUNMI, Bluetooth, USB or Wi-Fi printer was available for acceptance testing. Verify paper-out, open cover, disconnect, long/multi-lottery tickets, barcode readability, reprints and app upgrades on each device before operational use.

For the manual SDK build described above, add the AAR's classes.jar to ECJ's classpath and d8's inputs. Manifest includes SUNMI package visibility. The SDK dependency does not require any additional application resources. Keep signing keys outside source control. Browser printing reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/print. Android fallback reference: https://developer.android.com/training/printing/html-docs.
