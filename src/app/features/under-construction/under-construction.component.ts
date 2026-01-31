import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-under-construction',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule
  ],
  templateUrl: './under-construction.component.html',
})
export class UnderConstructionComponent {
  constructor(private router: Router) { }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goToPOS(): void {
    this.router.navigate(['/pos']);
  }
}

