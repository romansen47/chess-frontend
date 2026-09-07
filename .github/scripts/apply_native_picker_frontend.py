from pathlib import Path

manager_path = Path("src/EngineConfigManager.tsx")
text = manager_path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match, found {count}: {old[:120]!r}")
    text = text.replace(old, new, 1)


replace_once(
    '  const [newEngineName, setNewEngineName] = useState("");\n',
    '  const [newEngineName, setNewEngineName] = useState("");\n'
    '  const [manualEnginePath, setManualEnginePath] = useState("");\n'
)

replace_once(
    'function defaultProfileForEngine(engine: EngineDefinition): EngineProfile {\n'
    '  return {\n'
    '    id: null,\n'
    '    name: `${engine.name} Profile`,\n'
    '    engineId: engine.id ?? "",\n'
    '    optionValues: Object.fromEntries(\n'
    '      Object.entries(engine.options)\n'
    '        .filter(([, option]) => option.type !== "button")\n'
    '        .map(([name, option]) => [name, option.defaultValue ?? ""])\n'
    '    ),\n'
    '  };\n'
    '}\n\n',
    'function defaultProfileForEngine(engine: EngineDefinition): EngineProfile {\n'
    '  return {\n'
    '    id: null,\n'
    '    name: `${engine.name} Profile`,\n'
    '    engineId: engine.id ?? "",\n'
    '    optionValues: Object.fromEntries(\n'
    '      Object.entries(engine.options)\n'
    '        .filter(([, option]) => option.type !== "button")\n'
    '        .map(([name, option]) => [name, option.defaultValue ?? ""])\n'
    '    ),\n'
    '  };\n'
    '}\n\n'
    'async function readErrorMessage(response: Response): Promise<string> {\n'
    '  const text = await response.text();\n'
    '  if (!text.trim()) {\n'
    '    return `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;\n'
    '  }\n\n'
    '  try {\n'
    '    const payload = JSON.parse(text) as { message?: unknown; error?: unknown };\n'
    '    if (typeof payload.message === "string" && payload.message.trim()) {\n'
    '      return payload.message;\n'
    '    }\n'
    '    if (typeof payload.error === "string" && payload.error.trim()) {\n'
    '      return payload.error;\n'
    '    }\n'
    '  } catch {\n'
    '    // The backend may intentionally return a plain-text validation message.\n'
    '  }\n\n'
    '  return text;\n'
    '}\n\n'
)

replace_once(
    '    setNewEngineName("");\n'
    '    setProfileOptionEditor(null);\n',
    '    setNewEngineName("");\n'
    '    setManualEnginePath("");\n'
    '    setProfileOptionEditor(null);\n'
)

old_inspect = '''  async function inspectEngine() {
    const requestedName = (engineDraft?.id ? "" : engineDraft?.name ?? newEngineName).trim();

    try {
      setBusy(true);
      setError(null);
      setMessage("Opening system file picker…");
      const response = await fetch("/api/engine-configs/engines/select", {
        method: "POST",
      });
      if (response.status === 204) {
        setMessage(null);
        return;
      }
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const inspected = (await response.json()) as EngineDefinition;
      if (requestedName) {
        inspected.name = requestedName;
      }
      setEngineDraft(copyEngine(inspected));
      setNewEngineName(inspected.name);
      setOptionFilter("");
      setMessage(
        `${inspected.engineName} detected · ${Object.keys(inspected.options).length} UCI options`
      );
    } catch (e) {
      setEngineDraft(null);
      setMessage(null);
      setError(e instanceof Error ? e.message : "Engine could not be selected or inspected.");
    } finally {
      setBusy(false);
    }
  }
'''

new_inspect = '''  function applyInspectedEngine(inspected: EngineDefinition, requestedName: string) {
    if (requestedName) {
      inspected.name = requestedName;
    }
    setEngineDraft(copyEngine(inspected));
    setNewEngineName(inspected.name);
    setManualEnginePath(inspected.engine);
    setOptionFilter("");
    setMessage(
      t("settings.engineDetected", {
        engine: inspected.engineName,
        count: Object.keys(inspected.options).length,
      })
    );
  }

  async function inspectEngine() {
    const requestedName = (engineDraft?.id ? "" : engineDraft?.name ?? newEngineName).trim();

    try {
      setBusy(true);
      setError(null);
      setMessage(t("settings.openingSystemPicker"));
      const response = await fetch("/api/engine-configs/engines/select", {
        method: "POST",
      });
      if (response.status === 204) {
        setMessage(null);
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      const inspected = (await response.json()) as EngineDefinition;
      applyInspectedEngine(inspected, requestedName);
    } catch (e) {
      setMessage(null);
      setError(e instanceof Error ? e.message : t("settings.engineSelectionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function inspectEnginePath() {
    const enginePath = manualEnginePath.trim();
    if (!enginePath) {
      return;
    }

    const requestedName = newEngineName.trim();
    try {
      setBusy(true);
      setError(null);
      setMessage(t("settings.inspectingEngine"));
      const response = await fetch("/api/engine-configs/engines/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine: enginePath,
          name: requestedName || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      const inspected = (await response.json()) as EngineDefinition;
      applyInspectedEngine(inspected, requestedName);
    } catch (e) {
      setMessage(null);
      setError(e instanceof Error ? e.message : t("settings.engineInspectionFailed"));
    } finally {
      setBusy(false);
    }
  }
'''
replace_once(old_inspect, new_inspect)

old_card = '''                    {creatingEngine && !engineDraft && (
                      <div className="engine-config-create-card">
                        <div className="engine-config-details-heading">
                          <div>
                            <strong>Neue Engine definieren</strong>
                            <span>Step 1 · Select the executable using the system file picker</span>
                          </div>
                        </div>
                        <div className="engine-config-form-grid">
                          <label>
                            <span>Engine name (optional)</span>
                            <input
                              value={newEngineName}
                              onChange={(event) => setNewEngineName(event.target.value)}
                              placeholder="Otherwise taken from the UCI engine"
                            />
                          </label>
                        </div>
                        <div className="engine-config-default-info">
                          The file dialog opens on the computer running the backend. After selection, the engine is inspected automatically through UCI.
                        </div>
                        <div className="engine-config-actions">
                          <button type="button" onClick={() => void inspectEngine()} disabled={busy}>
                            {busy ? "File picker is open…" : "Select engine file…"}
                          </button>
                        </div>
                      </div>
                    )}
'''

new_card = '''                    {creatingEngine && !engineDraft && (
                      <div className="engine-config-create-card">
                        <div className="engine-config-details-heading">
                          <div>
                            <strong>{t("settings.newEngineTitle")}</strong>
                            <span>{t("settings.selectExecutableStep")}</span>
                          </div>
                        </div>
                        <div className="engine-config-form-grid">
                          <label>
                            <span>{t("settings.engineNameOptional")}</span>
                            <input
                              value={newEngineName}
                              onChange={(event) => setNewEngineName(event.target.value)}
                              placeholder={t("settings.engineNameFromUci")}
                            />
                          </label>
                        </div>
                        <div className="engine-config-default-info">
                          {t("settings.systemPickerInfo")}
                        </div>
                        <div className="engine-config-actions">
                          <button type="button" onClick={() => void inspectEngine()} disabled={busy}>
                            {busy ? t("settings.openingSystemPicker") : t("settings.selectEngineFile")}
                          </button>
                        </div>
                        <div className="engine-config-default-info">
                          {t("settings.manualEnginePathInfo")}
                        </div>
                        <div className="engine-config-form-grid">
                          <label>
                            <span>{t("settings.enginePath")}</span>
                            <input
                              value={manualEnginePath}
                              onChange={(event) => setManualEnginePath(event.target.value)}
                              placeholder={t("settings.enginePathPlaceholder")}
                            />
                          </label>
                        </div>
                        <div className="engine-config-actions">
                          <button
                            type="button"
                            onClick={() => void inspectEnginePath()}
                            disabled={busy || !manualEnginePath.trim()}
                          >
                            {busy ? t("settings.inspectingEngine") : t("settings.inspectEnginePath")}
                          </button>
                        </div>
                      </div>
                    )}
'''
replace_once(old_card, new_card)
manager_path.write_text(text)

i18n_path = Path("src/i18n/I18nProvider.tsx")
i18n = i18n_path.read_text()
marker = '  "settings.deleteProfileConfirm": { en: \'Delete engine profile "{name}"?\', de: \'Engine-Profil "{name}" löschen?\', fr: \'Supprimer le profil de moteur "{name}" ?\' },\n'
if i18n.count(marker) != 1:
    raise SystemExit("Could not find translation insertion marker")

additions = '''  "settings.newEngineTitle": { en: "Define new engine", de: "Neue Engine definieren", fr: "Définir un nouveau moteur" },
  "settings.selectExecutableStep": { en: "Step 1 · Select or enter the engine executable", de: "Schritt 1 · Engine-Programmdatei auswählen oder Pfad eingeben", fr: "Étape 1 · Sélectionner ou saisir l’exécutable du moteur" },
  "settings.engineNameOptional": { en: "Engine name (optional)", de: "Engine-Name (optional)", fr: "Nom du moteur (facultatif)" },
  "settings.engineNameFromUci": { en: "Otherwise taken from the UCI engine", de: "Andernfalls aus der UCI-Engine übernommen", fr: "Sinon repris du moteur UCI" },
  "settings.systemPickerInfo": { en: "Open the native file dialog on the computer running the backend. Windows, macOS and supported Linux desktops use their system file picker.", de: "Öffnet den nativen Dateidialog auf dem Computer, auf dem das Backend läuft. Windows, macOS und unterstützte Linux-Desktops verwenden ihren System-Dateidialog.", fr: "Ouvre le sélecteur de fichiers natif sur l’ordinateur qui exécute le backend. Windows, macOS et les bureaux Linux pris en charge utilisent leur sélecteur système." },
  "settings.openingSystemPicker": { en: "Opening system file picker…", de: "System-Dateidialog wird geöffnet…", fr: "Ouverture du sélecteur de fichiers système…" },
  "settings.selectEngineFile": { en: "Select engine file…", de: "Engine-Datei auswählen…", fr: "Sélectionner le fichier du moteur…" },
  "settings.manualEnginePathInfo": { en: "If no graphical file picker is available, enter the executable path manually and let the backend validate it through UCI.", de: "Falls kein grafischer Dateidialog verfügbar ist, gib den Pfad zur Programmdatei manuell ein. Das Backend prüft die Engine anschließend über UCI.", fr: "Si aucun sélecteur graphique n’est disponible, saisissez manuellement le chemin de l’exécutable. Le backend le validera ensuite via UCI." },
  "settings.enginePath": { en: "Engine executable path", de: "Pfad zur Engine-Programmdatei", fr: "Chemin de l’exécutable du moteur" },
  "settings.enginePathPlaceholder": { en: "e.g. C:\\engines\\stockfish.exe or /usr/games/stockfish", de: "z. B. C:\\engines\\stockfish.exe oder /usr/games/stockfish", fr: "p. ex. C:\\engines\\stockfish.exe ou /usr/games/stockfish" },
  "settings.inspectEnginePath": { en: "Inspect engine path", de: "Engine-Pfad prüfen", fr: "Vérifier le chemin du moteur" },
  "settings.inspectingEngine": { en: "Inspecting engine…", de: "Engine wird geprüft…", fr: "Vérification du moteur…" },
  "settings.engineDetected": { en: "{engine} detected · {count} UCI options", de: "{engine} erkannt · {count} UCI-Optionen", fr: "{engine} détecté · {count} options UCI" },
  "settings.engineSelectionFailed": { en: "Engine could not be selected or inspected.", de: "Die Engine konnte nicht ausgewählt oder geprüft werden.", fr: "Le moteur n’a pas pu être sélectionné ou vérifié." },
  "settings.engineInspectionFailed": { en: "Engine path could not be inspected.", de: "Der Engine-Pfad konnte nicht geprüft werden.", fr: "Le chemin du moteur n’a pas pu être vérifié." },
'''
i18n = i18n.replace(marker, additions + marker, 1)
i18n_path.write_text(i18n)
