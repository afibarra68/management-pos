import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { environment } from '../../../environments/environment';

export interface TableColumn {
  field: string;
  header: string;
  width?: string;
}

export interface TableData {
  data: any[];
  totalRecords: number;
  isFirst?: boolean;
}

@Component({
  selector: 'app-table-lib',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule
  ],
  templateUrl: './table.component.html',
})
export class TableComponent {
  private _dataTable: any[] = [];
  private _totalRecords = 0;

  @Input() cols: TableColumn[] = [];
  @Output() pagination = new EventEmitter<any>();
  @Input() hasEdit = true;
  @Input() hasDetail = true;
  @Input() hasDelete = true;
  @Input() hasReport = false;
  @Output() onEdit = new EventEmitter<any>();
  @Output() onDetail = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onReport = new EventEmitter<any>();

  selected: any;
  rows: number = environment.rowsPerPage || 10;
  isNotRowSelected = true;
  _first = 0;

  @Input() set first(value: number) {
    this._first = value;
  }

  get first(): number {
    return this._first;
  }

  @Input() set dataTable(data: TableData | any[] | null | undefined) {
    if (!data) {
      this._dataTable = [];
      this._totalRecords = 0;
      return;
    }

    if (Array.isArray(data)) {
      this._dataTable = data;
      this._totalRecords = data.length;
    } else {
      this._dataTable = data.data || [];
      this._totalRecords = data.totalRecords || 0;
      if (data.isFirst && this._first !== 0) {
        this._first = 0;
      }
    }
    this.isNotRowSelected = true;
    this.selected = null;
  }

  get dataTable(): any[] {
    return this._dataTable;
  }

  get totalRecords(): number {
    return this._totalRecords;
  }

  paginationEmitter(event: any): void {
    // Emitir siempre para permitir carga inicial cuando totalRecords es 0
    const page = event.first / event.rows;
    this.first = event.first;
    this.pagination.emit({
      page: page,
      first: event.first,
      rows: event.rows,
      pageCount: event.pageCount
    });
  }

  editEmitter(): void {
    this.onEdit.emit(this.selected);
  }

  detailEmitter(): void {
    this.onDetail.emit(this.selected);
  }

  deleteEmitter(): void {
    this.onDelete.emit(this.selected);
  }

  reportEmitter(): void {
    this.onReport.emit(this.selected);
  }

  colWidth(col: TableColumn): any {
    return { width: col.width ?? '220px' };
  }

  checkEmpty(value: any): string {
    return value !== null && value !== undefined ? String(value) : '-';
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => {
      return current && current[prop] !== undefined ? current[prop] : null;
    }, obj);
  }
}

