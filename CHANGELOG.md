# Changelog - TParking (Frontend)

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [Unreleased]

### Changed
- **ClientsComponent**: Se removió el campo `paymentDay` del formulario de creación y edición de clientes.
  - El campo `paymentDay` ya no aparece en el formulario modal.
  - El campo sigue siendo visible en la tabla de consulta (solo lectura).
  - El campo se excluye automáticamente del payload enviado al backend.

### Fixed
- **SpinnerComponent**: Optimización del cierre del spinner para que se oculte inmediatamente cuando el servicio responde.
  - Se agregó `ChangeDetectorRef.detectChanges()` en los componentes `CountriesComponent` y `ClientsComponent` para forzar la detección de cambios.
  - El spinner ahora se oculta instantáneamente sin retrasos visibles.

### Technical Details
- **Archivos modificados**:
  - `src/app/features/administration/clients/clients.component.ts` - Removido `paymentDay` del FormGroup y del método `submitForm()`
  - `src/app/features/administration/clients/clients.component.html` - Removido campo del formulario
  - `src/app/features/administration/countries/countries.component.ts` - Agregado `ChangeDetectorRef` para optimizar spinner
  - `src/app/features/administration/clients/clients.component.ts` - Agregado `ChangeDetectorRef` para optimizar spinner

---

## [1.0.0] - 2025-11-29

### Added
- Implementación inicial de la aplicación Angular
- Sistema de autenticación con login
- Interceptor HTTP para tokens JWT
- Gestión de países (CRUD completo)
- Gestión de clientes (CRUD completo con paginación)
- Sidebar colapsable con menú dinámico
- Componente de control de usuario (logout)
- Componentes compartidos (Spinner, Table)
- Integración con PrimeNG v20
- Configuración de SSR (Server-Side Rendering)
- Proxy configuration para API calls

### Changed
- Migración a sintaxis moderna de Angular (`@if` control flow)
- Optimización de detección de cambios con `ChangeDetectorRef`
- Mejoras en el manejo de estados de carga

### Fixed
- Corrección de errores de SSR relacionados con `localStorage`
- Corrección de problemas de detección de cambios en modo zoneless
- Corrección del spinner que se quedaba visible después de recibir datos
- Corrección de la aparición breve del sidebar durante el login

---

## Notas de Release

### Versión Actual: 1.0.1 (Unreleased)
- **Rama**: `feature/ajustes-client-paymentday`
- **Estado**: Listo para merge a `main`
- **Cambios**: 
  - Remover campo `paymentDay` del formulario de clientes
  - Optimización del cierre del spinner

### Próximos Pasos
1. Merge request a `main` está listo para revisión
2. Después del merge, crear tag de versión `v1.0.1`
3. Actualizar documentación si es necesario

