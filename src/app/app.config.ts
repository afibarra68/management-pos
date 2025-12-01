import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    providePrimeNG({
      theme: {
        preset: Aura
      }
    }),
    DialogService,
    ConfirmationService,
    MessageService,
    provideRouter(
      routes,
      withComponentInputBinding(), // Permite pasar datos del router directamente a los componentes
      withViewTransitions() // Transiciones suaves entre vistas
    ),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch() // Habilitado para mejor rendimiento y compatibilidad con SSR
    )
  ]
};
