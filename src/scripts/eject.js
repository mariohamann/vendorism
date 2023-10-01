import {
  text,
} from '@clack/prompts';
import fs from 'fs';
import { updateVsCodeReadOnlyFiles } from './update-vs-code-readonly-files.js';
import { defaults } from './target.js';


export const ejectFile = async (config, file) => {
  if (!config.target.head) {
    config.target.head = defaults.head;
  }

  const fileContent = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, fileContent.replace(config.target.head, ''));

  if(config.target.lockFilesForVsCode) {
    await updateVsCodeReadOnlyFiles([file], [], config.target.lockFilesForVsCode === true ? undefined : config.target.lockFilesForVsCode);
  }
}
