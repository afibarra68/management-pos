# Llamadas API en /pos (dashboard)

## Resumen por componente (carga inicial)

| Origen | Endpoint | Cantidad |
|--------|----------|----------|
| **PosDashboardComponent** | `GET /closed-transactions/today-stats` | 1 |
| **ParkingMapComponent** | `GET /open-transactions?status=OPEN` | 1 |
| **ParkingMapComponent** | `GET /vehicle-capacities/by-company/{id}/active` | 1 |
| **CashRegisterViewComponent** | `GET /shift-assignments/by-user-date?userId=&shiftDate=` | 1 |
| **CashRegisterViewComponent** | `GET /shift-validation/active-shift` | 1 |
| **CashRegisterViewComponent** | `GET /cash-registers/by-shift/{id}` | 1 |
| **CashRegisterViewComponent** | `GET /cash-registers/by-shift/{id}/total` | 1 |
| **CashRegisterViewComponent** | `GET /shift-validation/can-close/{id}` | 1 |

**Total: 8 llamadas** en la carga inicial del dashboard.

---

## Cambios realizados (reducción de duplicados)

- **Antes:** `by-user-date`, `cash-registers/by-shift/{id}` y `cash-registers/by-shift/{id}/total` se llamaban también desde `PosDashboardComponent.loadTotalCash()`, lo que generaba **3 llamadas duplicadas** (~11 en total).
- **Ahora:** `CashRegisterViewComponent` es la única fuente de esos datos. Emite `cashRegisterUpdated` con `{ totalInCash }` y el dashboard actualiza `totalCash` sin hacer nuevas peticiones.

---

## Eventos que disparan nuevas llamadas

- **vehicleRegistered** → `ParkingMapComponent.loadParkingMap()` (2), `CashRegisterViewComponent.loadCashRegisters()` (2).
- **transactionClosed** → `PosDashboardComponent.loadStats()` (1), `ParkingMapComponent.loadParkingMap()` (2), `CashRegisterViewComponent.loadCashRegisters()` (2).
