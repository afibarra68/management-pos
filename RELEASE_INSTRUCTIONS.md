# Instrucciones de Release - TParking (Frontend)

## 📦 Estado Actual

- **Rama actual**: `feature/ajustes-client-paymentday`
- **Commit**: `3eb2968` - "feat: remover paymentDay del formulario y optimizar spinner"
- **Estado**: ✅ Listo para push y merge request

## 🚀 Pasos para Publicar

### 1. Push de la rama a GitHub/GitLab

```bash
cd t-parking
git push -u origin feature/ajustes-client-paymentday
```

### 2. Crear Merge Request en GitHub/GitLab

1. Ir al repositorio en GitHub/GitLab
2. Click en "Pull Requests" o "Merge Requests"
3. Click en "New Pull Request" o "New Merge Request"
4. Seleccionar:
   - **Base branch**: `main`
   - **Compare branch**: `feature/ajustes-client-paymentday`
5. Título: `feat: remover paymentDay del formulario y optimizar spinner`
6. Descripción: Copiar contenido de `MERGE_REQUEST.md`
7. Asignar revisores si es necesario
8. Marcar como "Ready for Review" o "Ready to merge"

### 3. Después del Merge

```bash
# Cambiar a main
git checkout main

# Actualizar main
git pull origin main

# Crear tag de versión
git tag -a v1.0.1 -m "Release v1.0.1: Remover paymentDay del formulario y optimizar spinner"
git push origin v1.0.1

# Opcional: Eliminar rama feature local
git branch -d feature/ajustes-client-paymentday
```

## 📝 Resumen de Cambios

### Archivos Modificados
- `src/app/features/administration/clients/clients.component.ts`
- `src/app/features/administration/clients/clients.component.html`
- `src/app/features/administration/countries/countries.component.ts`

### Archivos Nuevos
- `CHANGELOG.md`
- `MERGE_REQUEST.md`
- `RELEASE_INSTRUCTIONS.md`
- `src/app/shared/components/spinner/` (componente spinner)

### Cambios Técnicos
- Removido `paymentDay` del FormGroup en ClientsComponent
- Removido campo `paymentDay` del formulario HTML
- Agregado `ChangeDetectorRef` para optimizar cierre del spinner
- El campo `paymentDay` sigue visible en la tabla (solo lectura)
- Spinner se cierra inmediatamente al recibir respuesta

## ✅ Checklist Pre-Merge

- [x] Código compilado sin errores
- [x] No hay errores de linting
- [x] CHANGELOG.md actualizado
- [x] MERGE_REQUEST.md creado
- [x] Commit con mensaje descriptivo
- [ ] Push realizado
- [ ] Merge Request creado
- [ ] Revisión aprobada
- [ ] Merge completado
- [ ] Tag de versión creado

---

**Autor**: Sistema de gestión de releases
**Fecha**: 2025-11-29

