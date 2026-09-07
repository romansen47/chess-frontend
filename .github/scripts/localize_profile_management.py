from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label}, found {count}")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Translation catalogue
# ---------------------------------------------------------------------------
i18n_path = Path("src/i18n/I18nProvider.tsx")
i18n = i18n_path.read_text(encoding="utf-8")

anchor = '  "settings.saveDefaults": { en: "Save Defaults", de: "Standards speichern", fr: "Enregistrer les valeurs par défaut" },\n'
translations = '''  "settings.engineProfiles": { en: "Engine Profiles", de: "Engine-Profile", fr: "Profils de moteur" },
  "settings.profileValuesSubtitle": { en: "Engine and concrete UCI values", de: "Engine und konkrete UCI-Werte", fr: "Moteur et valeurs UCI concrètes" },
  "settings.newProfile": { en: "New Profile", de: "Neues Profil", fr: "Nouveau profil" },
  "settings.assignedProfile": { en: "Assigned profile", de: "Zugeordnetes Profil", fr: "Profil attribué" },
  "settings.reusableProfile": { en: "Reusable profile", de: "Wiederverwendbares Profil", fr: "Profil réutilisable" },
  "settings.newProfileTitle": { en: "New profile", de: "Neues Profil", fr: "Nouveau profil" },
  "settings.selectDefinedEngineStep": { en: "Step 1 · Select an already defined engine", de: "Schritt 1 · Bereits definierte Engine auswählen", fr: "Étape 1 · Sélectionner un moteur déjà défini" },
  "settings.noEngineAvailable": { en: "No engine available", de: "Keine Engine verfügbar", fr: "Aucun moteur disponible" },
  "settings.defineEngineFirst": { en: "Define a UCI engine under Engines first.", de: "Definiere zuerst unter Engines eine UCI-Engine.", fr: "Définissez d’abord un moteur UCI sous Moteurs." },
  "settings.selectEngine": { en: "Select engine…", de: "Engine auswählen…", fr: "Sélectionner un moteur…" },
  "settings.continue": { en: "Continue", de: "Weiter", fr: "Continuer" },
  "settings.noProfileSelected": { en: "No profile selected", de: "Kein Profil ausgewählt", fr: "Aucun profil sélectionné" },
  "settings.selectOrCreateProfile": { en: "Select a profile on the left or create a new one.", de: "Wähle links ein Profil aus oder erstelle ein neues.", fr: "Sélectionnez un profil à gauche ou créez-en un nouveau." },
  "settings.configureProfile": { en: "Configure profile", de: "Profil konfigurieren", fr: "Configurer le profil" },
  "settings.reusableEngineConfiguration": { en: "{engine} · reusable engine configuration", de: "{engine} · wiederverwendbare Engine-Konfiguration", fr: "{engine} · configuration de moteur réutilisable" },
  "settings.configureUciStep": { en: "Step 2 · Configure UCI values for {engine}", de: "Schritt 2 · UCI-Werte für {engine} konfigurieren", fr: "Étape 2 · Configurer les valeurs UCI pour {engine}" },
  "settings.fallbackProfileInfo": { en: "This profile is the fallback for {engine}. It can be edited like any other profile, but it cannot be deleted while it is the fallback.", de: "Dieses Profil ist das Fallback-Profil für {engine}. Es kann wie jedes andere Profil bearbeitet werden, aber nicht gelöscht werden, solange es als Fallback dient.", fr: "Ce profil sert de profil de secours pour {engine}. Il peut être modifié comme les autres profils, mais ne peut pas être supprimé tant qu’il sert de secours." },
  "settings.profileName": { en: "Profile name", de: "Profilname", fr: "Nom du profil" },
  "settings.profileUciOptions": { en: "Profile UCI Options ({count})", de: "UCI-Optionen des Profils ({count})", fr: "Options UCI du profil ({count})" },
  "settings.profileUciOptionsDescription": { en: "Values are only displayed here. Click a value to edit that specific option.", de: "Die Werte werden hier nur angezeigt. Klicke auf einen Wert, um die jeweilige Option zu bearbeiten.", fr: "Les valeurs sont uniquement affichées ici. Cliquez sur une valeur pour modifier l’option correspondante." },
  "settings.filterOptions": { en: "Filter options", de: "Optionen filtern", fr: "Filtrer les options" },
  "settings.resetDefaults": { en: "Reset defaults", de: "Standardwerte zurücksetzen", fr: "Réinitialiser les valeurs par défaut" },
  "settings.noMatchingUciOptions": { en: "No matching UCI options.", de: "Keine passenden UCI-Optionen.", fr: "Aucune option UCI correspondante." },
  "settings.fallbackProfileCannotDelete": { en: "Fallback profile cannot be deleted", de: "Das Fallback-Profil kann nicht gelöscht werden", fr: "Le profil de secours ne peut pas être supprimé" },
  "settings.removeFromDefaultsBeforeDelete": { en: "Remove this profile from Defaults before deleting it", de: "Entferne dieses Profil vor dem Löschen aus den Standards", fr: "Retirez ce profil des valeurs par défaut avant de le supprimer" },
  "settings.deleteProfile": { en: "Delete Profile", de: "Profil löschen", fr: "Supprimer le profil" },
  "settings.saveProfile": { en: "Save Profile", de: "Profil speichern", fr: "Enregistrer le profil" },
  "settings.createProfile": { en: "Create Profile", de: "Profil erstellen", fr: "Créer le profil" },
  "settings.editOption": { en: "Edit {name}", de: "{name} bearbeiten", fr: "Modifier {name}" },
  "settings.closeEditor": { en: "Close editor", de: "Editor schließen", fr: "Fermer l’éditeur" },
  "settings.profileValue": { en: "Profile value", de: "Profilwert", fr: "Valeur du profil" },
  "settings.apply": { en: "Apply", de: "Übernehmen", fr: "Appliquer" },
  "settings.clickToEdit": { en: "click to edit", de: "zum Bearbeiten klicken", fr: "cliquer pour modifier" },
  "settings.profileCreated": { en: "Engine profile created.", de: "Engine-Profil erstellt.", fr: "Profil de moteur créé." },
  "settings.profileSaved": { en: "Engine profile saved.", de: "Engine-Profil gespeichert.", fr: "Profil de moteur enregistré." },
  "settings.profileSaveFailed": { en: "Engine profile could not be saved.", de: "Engine-Profil konnte nicht gespeichert werden.", fr: "Impossible d’enregistrer le profil de moteur." },
  "settings.profileDeleted": { en: "Engine profile deleted.", de: "Engine-Profil gelöscht.", fr: "Profil de moteur supprimé." },
  "settings.profileDeleteFailed": { en: "Engine profile could not be deleted.", de: "Engine-Profil konnte nicht gelöscht werden.", fr: "Impossible de supprimer le profil de moteur." },
  "settings.deleteProfileConfirm": { en: "Delete engine profile \"{name}\"?", de: "Engine-Profil \"{name}\" löschen?", fr: "Supprimer le profil de moteur \"{name}\" ?" },
'''
i18n = replace_once(i18n, anchor, anchor + translations, "translation insertion anchor")
i18n_path.write_text(i18n, encoding="utf-8")


# ---------------------------------------------------------------------------
# Profile management UI
# ---------------------------------------------------------------------------
path = Path("src/EngineConfigManager.tsx")
text = path.read_text(encoding="utf-8")

replacements = {
    'setMessage(isNew ? "Engine profile created." : "Engine profile saved.");':
        'setMessage(isNew ? t("settings.profileCreated") : t("settings.profileSaved"));',
    'setError(e instanceof Error ? e.message : "Engine profile could not be saved.");':
        'setError(e instanceof Error ? e.message : t("settings.profileSaveFailed"));',
    'if (!window.confirm(`Delete engine profile "${selectedStoredProfile.name}"?`)) {':
        'if (!window.confirm(t("settings.deleteProfileConfirm", { name: selectedStoredProfile.name }))) {',
    'setMessage("Engine profile deleted.");':
        'setMessage(t("settings.profileDeleted"));',
    'setError(e instanceof Error ? e.message : "Engine profile could not be deleted.");':
        'setError(e instanceof Error ? e.message : t("settings.profileDeleteFailed"));',
    'title={`${name}: ${displayValue} · click to edit`}':
        'title={`${name}: ${displayValue} · ${t("settings.clickToEdit")}`}',
    '<strong>{mode === "ENGINES" ? "Defined Engines" : "Engine Profiles"}</strong>':
        '<strong>{mode === "ENGINES" ? "Defined Engines" : t("settings.engineProfiles")}</strong>',
    '? "Executable und UCI-Definition"\n                        : "Engine and concrete UCI values"':
        '? "Executable und UCI-Definition"\n                        : t("settings.profileValuesSubtitle")',
    '{mode === "ENGINES" ? "New Engine" : "New Profile"}':
        '{mode === "ENGINES" ? "New Engine" : t("settings.newProfile")}',
    '<span className="engine-config-nav-active-dot" title="Assigned profile" />':
        '<span className="engine-config-nav-active-dot" title={t("settings.assignedProfile")} />',
    '<span className="engine-config-nav-meta">{engine?.name ?? "Unknown engine"}</span>':
        '<span className="engine-config-nav-meta">{engine?.name ?? t("settings.unknownEngine")}</span>',
    '{fallback ? "Fallback" : labels.length > 0 ? labels.join(" · ") : "Reusable profile"}':
        '{fallback ? t("settings.fallback") : labels.length > 0 ? labels.join(" · ") : t("settings.reusableProfile")}',
    '<strong>New profile</strong>':
        '<strong>{t("settings.newProfileTitle")}</strong>',
    '<span>Step 1 · Select an already defined engine</span>':
        '<span>{t("settings.selectDefinedEngineStep")}</span>',
    '<strong>No engine available</strong>':
        '<strong>{t("settings.noEngineAvailable")}</strong>',
    '<span>Definiere zuerst unter Engines eine UCI-Engine.</span>':
        '<span>{t("settings.defineEngineFirst")}</span>',
    '<option value="">Select engine…</option>':
        '<option value="">{t("settings.selectEngine")}</option>',
    '>\n                                Continue\n                              </button>':
        '>\n                                {t("settings.continue")}\n                              </button>',
    '<strong>No profile selected</strong>':
        '<strong>{t("settings.noProfileSelected")}</strong>',
    '<span>Select a profile on the left or create a new one.</span>':
        '<span>{t("settings.selectOrCreateProfile")}</span>',
    '<strong>{profileDraft.id ? profileDraft.name : "Configure profile"}</strong>':
        '<strong>{profileDraft.id ? profileDraft.name : t("settings.configureProfile")}</strong>',
    '? `${profileEngine.name} · reusable engine configuration`\n                                : `Step 2 · Configure UCI values for ${profileEngine.name}`}':
        '? t("settings.reusableEngineConfiguration", { engine: profileEngine.name })\n                                : t("settings.configureUciStep", { engine: profileEngine.name })}',
    'This profile is the fallback for <strong>{profileEngine.engine}</strong>. It can be edited like any other profile,\n                            but it cannot be deleted while it is the fallback.':
        '{t("settings.fallbackProfileInfo", { engine: profileEngine.engine })}',
    '<span>Profile name</span>':
        '<span>{t("settings.profileName")}</span>',
    '<strong>Profile UCI Options ({Object.keys(profileDraft.optionValues).length})</strong>':
        '<strong>{t("settings.profileUciOptions", { count: Object.keys(profileDraft.optionValues).length })}</strong>',
    'Values are only displayed here. Click a value to edit that specific option.':
        '{t("settings.profileUciOptionsDescription")}',
    'placeholder="Filter options"':
        'placeholder={t("settings.filterOptions")}',
    '>\n                              Reset defaults\n                            </button>':
        '>\n                              {t("settings.resetDefaults")}\n                            </button>',
    '<div className="engine-config-no-options">No matching UCI options.</div>':
        '<div className="engine-config-no-options">{t("settings.noMatchingUciOptions")}</div>',
    '? "Fallback profile cannot be deleted"\n                                  : isAssignedProfile(profileDraft.id)\n                                    ? "Remove this profile from Defaults before deleting it"':
        '? t("settings.fallbackProfileCannotDelete")\n                                  : isAssignedProfile(profileDraft.id)\n                                    ? t("settings.removeFromDefaultsBeforeDelete")',
    '>\n                              Delete Profile\n                            </button>':
        '>\n                              {t("settings.deleteProfile")}\n                            </button>',
    '{busy ? "Saving…" : profileDraft.id ? "Save Profile" : "Create Profile"}':
        '{busy ? t("settings.saving") : profileDraft.id ? t("settings.saveProfile") : t("settings.createProfile")}',
    'aria-label={`Edit ${profileOptionEditor.name}`}':
        'aria-label={t("settings.editOption", { name: profileOptionEditor.name })}',
    'aria-label="Close editor"':
        'aria-label={t("settings.closeEditor")}',
    '<span>Profile value</span>':
        '<span>{t("settings.profileValue")}</span>',
    '>\n                  Cancel\n                </button>\n                <button type="submit">Apply</button>':
        '>\n                  {t("common.cancel")}\n                </button>\n                <button type="submit">{t("settings.apply")}</button>',
}

for old, new in replacements.items():
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one profile UI fragment, found {count}: {old[:80]}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print(f"EngineConfigManager.tsx line count: {len(text.splitlines())}")
