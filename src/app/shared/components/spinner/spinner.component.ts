import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [
    CommonModule,
    ProgressSpinnerModule
  ],
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss']
})
export class SpinnerComponent {
  @Input() loading: boolean = false;
  @Input() size: 'small' | 'normal' | 'large' = 'normal';
  @Input() message: string = '';
  @Input() overlay: boolean = false;
}

