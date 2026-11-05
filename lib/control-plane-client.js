export class ControlPlaneClient {
  constructor(baseUrl, appKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.appKey = appKey;
  }

  async verify(licenseKey, instanceKey, context = {}) {
    return this.#post('/licenses/verify', { ...context, app_key: this.appKey, license_key: licenseKey, instance_key: instanceKey });
  }

  async checkUpdates(licenseKey, instanceKey, currentVersion, channel = 'stable', context = {}) {
    return this.#post(`/apps/${encodeURIComponent(this.appKey)}/updates/check`, { ...context, license_key: licenseKey, instance_key: instanceKey, current_version: currentVersion, channel });
  }

  async validateSync(licenseKey, instanceKey, requestId, clientTimestamp, context = {}) {
    return this.#post(`/apps/${encodeURIComponent(this.appKey)}/sync/validate`, { ...context, request_id: requestId, license_key: licenseKey, instance_key: instanceKey, client_timestamp: clientTimestamp });
  }

  async #post(path, payload) {
    const response = await fetch(`${this.baseUrl}/api/v1/control_plane.php${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Control plane request failed (${response.status})`);
    return data;
  }
}
