import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Lógica de seguridad de consulta entre usuarios para filtros de configuración.
 * Centraliza permisos por roles (ERole / credentials) para que todos los módulos
 * de configuración usen la misma regla.
 *
 * - Filtro por empresa: solo SUPER_ADMIN y SUPER_USER (multiempresa).
 * - Resto de roles: la empresa se toma del usuario logueado (companyId en credentials).
 */
@Injectable({ providedIn: 'root' })
export class ConfigCredentialsService {
  private auth = inject(AuthService);

  /** Roles que pueden ver y usar el filtro por empresa (multiempresa). Alineado con ERole. */
  private static readonly COMPANY_FILTER_ROLES = ['SUPER_ADMIN', 'SUPER_USER'] as const;

  /** Roles que pueden eliminar registros en listas de configuración/operación. */
  private static readonly CAN_DELETE_ROLES = [
    'ADMIN_APP',
    'ADMINISTRATOR_PRINCIPAL',
    'ADMINISTRADOR_EMPRESA'
  ] as const;

  /** Roles con acceso completo al POS (no solo consulta). */
  private static readonly POS_FULL_ACCESS_ROLES = [
    'PARKING_ATTENDANT',
    'SUPER_USER',
    'SUPER_ADMIN',
    'ADMINISTRATOR_PRINCIPAL',
    'ADMIN_APP',
    'AUDIT_SELLER'
  ] as const;

  /** Roles que solo tienen acceso a consulta (dash_informativo). */
  private static readonly CONSULTA_ONLY_ROLES = [
    'GESTOR_EXTERNO_OBSERVE',
    'GESTOR_EXTERNO_EDIT',
    'GESTOR_EXTERNO_EXITS'
  ] as const;

  /**
   * Indica si el usuario puede ver y usar el filtro por empresa en pantallas de configuración.
   * Solo SUPER_ADMIN y SUPER_USER (tipo credentials / ERole).
   */
  canViewCompanyFilter(): boolean {
    const roles = this.auth.getUserData()?.roles ?? [];
    return roles.some((r: string) =>
      (ConfigCredentialsService.COMPANY_FILTER_ROLES as readonly string[]).includes(r)
    );
  }

  /**
   * CompanyId efectivo para consultas: si puede ver filtro y se pasa un selectedCompanyId,
   * se usa ese; si no, el companyId del usuario (credentials).
   */
  getEffectiveCompanyId(selectedCompanyId: number | null | undefined): number | null {
    const userData = this.auth.getUserData();
    const userCompanyId = userData?.companyId ?? null;
    if (this.canViewCompanyFilter() && selectedCompanyId != null) {
      return selectedCompanyId;
    }
    return userCompanyId;
  }

  /**
   * Indica si el usuario puede eliminar registros en listas de configuración/operación.
   */
  canDeleteInConfig(): boolean {
    const roles = this.auth.getUserData()?.roles ?? [];
    return roles.some((r: string) =>
      (ConfigCredentialsService.CAN_DELETE_ROLES as readonly string[]).includes(r)
    );
  }

  /**
   * Indica si el usuario tiene solo rol de consulta (gestor externo).
   */
  isConsultaOnly(): boolean {
    const roles = this.auth.getUserData()?.roles ?? [];
    const hasConsulta = roles.some((r: string) =>
      (ConfigCredentialsService.CONSULTA_ONLY_ROLES as readonly string[]).includes(r)
    );
    const hasFullAccess = roles.some((r: string) =>
      (ConfigCredentialsService.POS_FULL_ACCESS_ROLES as readonly string[]).includes(r)
    );
    return hasConsulta && !hasFullAccess;
  }

  /**
   * Indica si el usuario puede acceder al módulo de consulta (dash_informativo).
   */
  canAccessConsulta(): boolean {
    const roles = this.auth.getUserData()?.roles ?? [];
    return roles.some((r: string) =>
      (ConfigCredentialsService.CONSULTA_ONLY_ROLES as readonly string[]).includes(r)
    );
  }
}
