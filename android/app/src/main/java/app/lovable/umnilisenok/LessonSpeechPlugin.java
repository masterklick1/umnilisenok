package app.lovable.umnilisenok;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

@CapacitorPlugin(name = "LessonSpeech", permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class LessonSpeechPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Runnable timeout = () -> finish(null, "TIMEOUT");
    private PluginCall pending;
    private SpeechRecognizer recognizer;
    private boolean destroyed;

    private boolean available() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        main.post(() -> call.resolve(new JSObject().put("available", !destroyed && available())));
    }

    @PluginMethod
    public void listen(PluginCall call) {
        main.post(() -> {
            if (destroyed || !available()) {
                call.reject("On-device speech recognition is unavailable", "UNAVAILABLE");
                return;
            }
            if (pending != null) {
                call.reject("Already listening", "BUSY");
                return;
            }
            pending = call;
            if (getPermissionState("microphone") == PermissionState.GRANTED) {
                startRecognition();
            } else {
                requestPermissionForAlias("microphone", call, "microphoneResult");
            }
        });
    }

    @PermissionCallback
    private void microphoneResult(PluginCall call) {
        main.post(() -> {
            if (pending != call) return;
            if (getPermissionState("microphone") == PermissionState.GRANTED) {
                startRecognition();
            } else {
                finish(null, "PERMISSION_DENIED");
            }
        });
    }

    private void startRecognition() {
        try {
            final PluginCall current = pending;
            recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) {}
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onPartialResults(Bundle partialResults) {}
                @Override public void onEvent(int eventType, Bundle params) {}

                @Override
                public void onError(int error) {
                    if (pending != current) return;
                    String code = switch (error) {
                        case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED,
                             SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "LANGUAGE_UNAVAILABLE";
                        case SpeechRecognizer.ERROR_NO_MATCH,
                             SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "NO_MATCH";
                        case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "PERMISSION_DENIED";
                        default -> "UNAVAILABLE";
                    };
                    finish(null, code);
                }

                @Override
                public void onResults(Bundle results) {
                    if (pending != current) return;
                    ArrayList<String> alternatives = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (alternatives == null || alternatives.isEmpty()) {
                        finish(null, "NO_MATCH");
                        return;
                    }
                    finish(new JSObject().put("alternatives", new JSArray(alternatives)), null);
                }
            });

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU")
                .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            recognizer.startListening(intent);
            main.postDelayed(timeout, 6000);
        } catch (RuntimeException error) {
            finish(null, "UNAVAILABLE");
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        main.post(() -> {
            finish(null, "CANCELLED");
            call.resolve();
        });
    }

    @Override
    protected void handleOnPause() {
        if (recognizer != null) finish(null, "CANCELLED");
    }

    @Override
    protected void handleOnDestroy() {
        destroyed = true;
        finish(null, "CANCELLED");
    }

    private void finish(JSObject result, String error) {
        PluginCall call = pending;
        pending = null;
        main.removeCallbacks(timeout);
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
        if (call == null) return;
        if (error == null) {
            call.resolve(result);
        } else {
            call.reject("Speech recognition ended", error);
        }
    }
}
