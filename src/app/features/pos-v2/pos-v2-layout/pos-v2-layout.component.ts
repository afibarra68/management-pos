import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-pos-v2-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  template: `
    <div class="pos-v2-layout">
      <div class="back-bar">
        <p-button label="Volver al Dashboard" icon="pi pi-arrow-left" routerLink="/v2pos"
          styleClass="p-button-secondary">
        </p-button>
      </div>
      <div class="outlet-wrap">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .pos-v2-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .back-bar {
      flex-shrink: 0;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--surface-border, #e5e7eb);
    }
    .outlet-wrap {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
  `]
})
export class PosV2LayoutComponent { }
