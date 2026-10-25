# Restore features lost in the accidental rollback

## Problem (confirmed)
The current version is missing Reading, Fairy Tales, screen-time and school-mode limits, garden, parent gifts, streak bonuses, reward items, parent feedback, learning-progress cards, watch mode, the Android auto-start receiver, and the "Забыли пароль?" / password reset page. The earlier full version still exists in project history (106 files differ).

## Plan
1. Restore every file from the last good version (commit 20fed9f) that was deleted or changed by the rollback, including `ResetPasswordPage`, the `/reset-password`, `/reading`, `/tales`, `/app`, `/index` routes and `<ScreenTimeGuard/>`.
2. Keep changes made after that version: Google and Yandex verification tags in `index.html`, `public/yandex_d30326485fce37ee.html`, the native English voice work in `src/lib/sound.ts` and English pages, and `codemagic.yaml` edits. Merge by hand where both sides changed a file.
3. Redeploy the `send-parent-feedback` function.
4. Check the build, then open login, reset password, Reading, Tales and the parent dashboard in the browser.

## Simpler alternative
Use History to revert to the version right before the rollback, then re-add only the verification codes and English voice fix.
