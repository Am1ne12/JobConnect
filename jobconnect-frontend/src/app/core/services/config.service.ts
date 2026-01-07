import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppConfig {
    apiUrl: string;
}

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private config: AppConfig = {
        apiUrl: environment.apiUrl // default fallback
    };

    private loaded = false;

    async loadConfig(): Promise<void> {
        if (this.loaded) return;

        try {
            const response = await fetch('/assets/config.json');
            if (response.ok) {
                const data = await response.json();
                // Only override if apiUrl is provided and not a placeholder
                if (data.apiUrl && !data.apiUrl.includes('${')) {
                    this.config = data;
                }
            }
        } catch (error) {
            console.warn('Could not load config.json, using environment defaults');
        }

        this.loaded = true;
    }

    get apiUrl(): string {
        return this.config.apiUrl;
    }
}

// Factory function for APP_INITIALIZER
export function initializeApp(configService: ConfigService): () => Promise<void> {
    return () => configService.loadConfig();
}
