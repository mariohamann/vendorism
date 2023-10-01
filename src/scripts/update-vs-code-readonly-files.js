import fs from 'fs';

const SETTINGS_PATH_FALLBACK = '.vscode/settings.json';

export async function updateVsCodeReadOnlyFiles(remove, add, settingsPath = SETTINGS_PATH_FALLBACK) {
  try {
    // Default settings object
    let settings = {};

    // If settings.json exists, read and parse it
    if (fs.existsSync(settingsPath)) {
      const rawData = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(rawData);
    }

    // Remove files from files.readonlyInclude
    for (const file of remove) {
      delete settings['files.readonlyInclude'][file];
    }

    const readonlyFiles = {};
    for (const file of add) {
      readonlyFiles[file] = true;
    }

    // Override files.readonlyInclude with the provided files object
    settings['files.readonlyInclude'] = {...readonlyFiles, ...settings['files.readonlyInclude']};

    // Write the updated settings back to settings.json
    await fs.mkdirSync(settingsPath.split('/').slice(0, -1).join('/'), { recursive: true });
    await fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf8');
  } catch (error) {
    console.error('An error occurred while updating settings:', error);
  }
}
