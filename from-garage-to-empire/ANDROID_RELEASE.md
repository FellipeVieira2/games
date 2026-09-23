# Android e release

## Preparação

Capacitor 8, `appId: com.garageempire.game`, assets locais de `dist`. O identificador é provisório: escolher um identificador próprio antes da primeira publicação. [A documentação do Capacitor 8](https://capacitorjs.com/docs/updating/8-0) orienta Android Studio Otter 2025.2.1+, compile/target API 36 e min API 24. As exigências devem ser conferidas novamente na data do envio.

```powershell
npm ci
npm run build
# Somente se android/ ainda não existir:
npm run android:init
npm run android:sync
npm run android:open
```

Instalar Android SDK 36 e JDK 21, exigido pelo código nativo do Capacitor gerado. A máquina desta implementação possui Java 8, sem SDK no caminho padrão e sem ANDROID_HOME/ANDROID_SDK_ROOT configurados. **Ter a pasta Android não comprova APK/AAB compilado ou execução em aparelho.**

## Debug e production

Dentro de `android/`:

```powershell
.\gradlew.bat assembleDebug
.\gradlew.bat bundleRelease
```

`debug` já usa `applicationIdSuffix .debug`, nome distinguível e é depurável. `release` tem `debuggable false`, sem `server.url`. A atividade principal está configurada como portrait em telefones; Android 16 pode ignorar restrições de orientação em telas grandes, então a interface segue responsiva. Backups automáticos do aplicativo estão desativados; não há sincronização de progresso com nuvem nesta fase.

## Assinatura

Release requer keystore e upload key sob controle do proprietário. Não há chave gerada, credencial fictícia nem segredo versionado. `signingConfigs.release` já lê variáveis locais/CI (`ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Tarefas release falham com mensagem explícita quando faltarem essas variáveis. Aderir ao Play App Signing, validar assinatura e instalar o bundle por faixa de teste interna antes de produção.

## Portões antes da Play Store

- Compilar e instalar em Android 16/API 36 e em aparelho intermediário; medir FPS/memória/bateria.
- Testar notch, barras do sistema, teclado, back button, pause/resume, matar processo e retorno sem rede.
- Validar haptics nativo, Web Locks/WebView, recuperação de save e limite offline.
- Substituir ícone/splash padrão por arte final Android, screenshots e ficha da loja.
- Política de privacidade pública, classificação etária e formulário Data Safety coerentes com os SDKs reais.
- AdService Android ainda pendente. Usar somente IDs de teste durante desenvolvimento; recompensar somente após callback confirmado.
- PurchaseService Android ainda pendente. Bens digitais usam Google Play Billing oficial com versão aceita na data do envio, restauração e validação de recibos. Não há pagamento externo.
- Definir analytics/crash reporting somente se houver necessidade, documentação da coleta e consentimento apropriado.

## Inventário atual de SDKs

Phaser (renderização), Lucide (ícones), Zod (validação), Capacitor Core/Android/App/Haptics (bridge, lifecycle e vibração). Nenhum SDK de publicidade, faturamento, analytics remoto ou crash reporting foi incorporado. ConsoleAnalytics só escreve eventos locais em desenvolvimento.
