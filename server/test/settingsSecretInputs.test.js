import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settingsSource = fs.readFileSync(path.resolve(__dirname, '../../client/src/views/Settings.vue'), 'utf8');

function inputFor(model) {
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = settingsSource.match(new RegExp(`<input[\\s\\S]*?v-model="${escaped}"[\\s\\S]*?\\/>`));
  assert.ok(match, `未找到 ${model} 输入框`);
  return match[0];
}

test('设置页的密钥输入框禁止密码管理器自动填入网站密码', () => {
  for (const model of [
    'form.ai_api_key',
    'translationForm.translation_api_key',
    'translationForm.translation_app_id',
  ]) {
    const input = inputFor(model);
    assert.match(input, /autocomplete="new-password"/);
    assert.match(input, /data-lpignore="true"/);
    assert.match(input, /data-1p-ignore/);
  }
});

test('加载设置时地址和模型只使用服务端保存值，不被服务商预设覆盖', () => {
  assert.match(settingsSource, /form\.value\.ai_base_url = r\.data\.ai_base_url/);
  assert.match(settingsSource, /form\.value\.ai_model = r\.data\.ai_model/);
  assert.match(settingsSource, /translationForm\.value\.translation_base_url = r\.data\.translation_base_url/);
  assert.match(settingsSource, /translationForm\.value\.translation_model = r\.data\.translation_model/);
  assert.doesNotMatch(settingsSource, /watch\(\(\) => form\.value\.ai_provider/);
  assert.doesNotMatch(settingsSource, /watch\(\(\) => translationForm\.value\.translation_provider/);
});
