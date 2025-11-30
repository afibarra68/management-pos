import { Injectable, signal, computed } from '@angular/core';

/**
 * Servicio para gestionar el estado del sidebar.
 * Utiliza signals de Angular 20 para reactividad eficiente.
 */
@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  // Signal privado para el estado colapsado
  private readonly collapsedState = signal<boolean>(false);

  /**
   * ReadonlySignal que expone el estado colapsado del sidebar.
   * Los componentes pueden leer este signal pero no modificarlo directamente.
   */
  get collapsed() {
    return this.collapsedState.asReadonly();
  }

  /**
   * Computed signal que indica si el sidebar está expandido.
   * Útil para lógica derivada en componentes.
   */
  readonly expanded = computed(() => !this.collapsedState());

  /**
   * Alterna el estado del sidebar entre colapsado y expandido.
   */
  toggle(): void {
    this.collapsedState.update(value => !value);
  }

  /**
   * Colapsa el sidebar.
   */
  collapse(): void {
    this.collapsedState.set(true);
  }

  /**
   * Expande el sidebar.
   */
  expand(): void {
    this.collapsedState.set(false);
  }
}
