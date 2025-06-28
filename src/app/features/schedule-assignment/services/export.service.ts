// src/app/features/schedule-assignment/services/export.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import {
  ClassSessionResponse,
  TeacherResponse,
  StudentGroupResponse,
  DayOfWeek,
  DAY_NAMES,
  WORKING_DAYS
} from '../models/class-session.model';

export interface ExportData {
  title: string;
  subtitle?: string;
  entity: TeacherResponse | StudentGroupResponse;
  sessions: ClassSessionResponse[];
  exportType: 'teacher' | 'group';
  metadata?: {
    totalHours: number;
    totalSessions: number;
    periodName?: string;
    generatedAt: Date;
    generatedBy?: string;
  };
}

export interface ScheduleGridData {
  timeSlots: {
    name: string;
    startTime: string;
    endTime: string;
    hours: {
      order: number;
      startTime: string;
      endTime: string;
      duration: number;
    }[];
  }[];
  schedule: {
    [timeSlotName: string]: {
      [hourOrder: number]: {
        [day: string]: {
          courseName?: string;
          teacherName?: string;
          groupName?: string;
          spaceName?: string;
          sessionType?: string;
          hasSession: boolean;
        };
      };
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Exporta horario a PDF
   */
  async exportToPDF(data: ExportData): Promise<void> {
    console.log('🖨️ Generating PDF export...', data.exportType);

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    try {
      // Header
      this.addPDFHeader(doc, data, pageWidth);

      // Generate schedule grid
      const gridData = this.generateScheduleGrid(data.sessions);

      // Add schedule table
      await this.addScheduleTableToPDF(doc, gridData, data.exportType);

      // Footer
      this.addPDFFooter(doc, data, pageHeight);

      // Generate filename
      const filename = this.generateFilename(data, 'pdf');

      // Save PDF
      doc.save(filename);

      console.log('✅ PDF exported successfully:', filename);
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      throw new Error('Error al generar el archivo PDF');
    }
  }

  /**
   * Exporta horario a Excel
   */
  async exportToExcel(data: ExportData): Promise<void> {
    console.log('📊 Generating Excel export...', data.exportType);

    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Generate schedule grid
      const gridData = this.generateScheduleGrid(data.sessions);

      // Create main schedule worksheet
      const scheduleSheet = this.createScheduleWorksheet(gridData, data);
      XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Horario');

      // Create summary worksheet
      const summarySheet = this.createSummaryWorksheet(data);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      // Create sessions detail worksheet
      const detailSheet = this.createSessionsDetailWorksheet(data.sessions, data.exportType);
      XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalle de Clases');

      // Generate filename and save
      const filename = this.generateFilename(data, 'xlsx');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      saveAs(blob, filename);

      console.log('✅ Excel exported successfully:', filename);
    } catch (error) {
      console.error('❌ Error generating Excel:', error);
      throw new Error('Error al generar el archivo Excel');
    }
  }

  // ===== MÉTODOS PRIVADOS PARA PDF =====

  private addPDFHeader(doc: jsPDF, data: ExportData, pageWidth: number): void {
    const margin = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title, pageWidth / 2, 20, { align: 'center' });

    // Subtitle
    if (data.subtitle) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(data.subtitle, pageWidth / 2, 30, { align: 'center' });
    }

    // Entity info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    if (data.exportType === 'teacher') {
      const teacher = data.entity as TeacherResponse;
      doc.text(`Docente: ${teacher.fullName}`, margin, 45);
      doc.setFont('helvetica', 'normal');
      doc.text(`Departamento: ${teacher.department.name}`, margin, 52);
      doc.text(`Email: ${teacher.email}`, margin, 59);
    } else {
      const group = data.entity as StudentGroupResponse;
      doc.text(`Grupo: ${group.name}`, margin, 45);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ciclo: ${group.cycleNumber} - ${group.careerName}`, margin, 52);
      doc.text(`Período: ${group.periodName}`, margin, 59);
    }

    // Metadata
    if (data.metadata) {
      doc.setFontSize(10);
      doc.text(`Total de clases: ${data.metadata.totalSessions}`, pageWidth - 80, 45);
      doc.text(`Total de horas: ${data.metadata.totalHours}`, pageWidth - 80, 52);
      doc.text(`Generado: ${data.metadata.generatedAt.toLocaleDateString('es-ES')}`, pageWidth - 80, 59);
    }
  }

  private async addScheduleTableToPDF(doc: jsPDF, gridData: ScheduleGridData, exportType: 'teacher' | 'group'): Promise<void> {
    const tableData: any[][] = [];
    const headers = ['Hora', ...WORKING_DAYS.map(day => DAY_NAMES[day])];

    // Generate table rows
    gridData.timeSlots.forEach(timeSlot => {
      timeSlot.hours.forEach(hour => {
        const row = [
          `${timeSlot.name}\n${hour.startTime}-${hour.endTime}\n(${hour.duration}min)`
        ];

        WORKING_DAYS.forEach(day => {
          const cellData = gridData.schedule[timeSlot.name]?.[hour.order]?.[day];

          if (cellData?.hasSession) {
            let cellContent = '';
            if (exportType === 'teacher') {
              cellContent = `${cellData.courseName}\n${cellData.groupName}\n${cellData.spaceName}`;
            } else {
              cellContent = `${cellData.courseName}\n${cellData.teacherName}\n${cellData.spaceName}`;
            }
            row.push(cellContent);
          } else {
            row.push('');
          }
        });

        tableData.push(row);
      });
    });
    // DESPUÉS (corregido)
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 70,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [70, 130, 180],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      tableLineColor: [128, 128, 128],
      tableLineWidth: 0.1,
      margin: { top: 70, left: 10, right: 10 }
    });
  }

  private addPDFFooter(doc: jsPDF, data: ExportData, pageHeight: number): void {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Documento generado automáticamente - ${new Date().toLocaleString('es-ES')}`,
      doc.internal.pageSize.getWidth() / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // ===== MÉTODOS PRIVADOS PARA EXCEL =====

  private createScheduleWorksheet(gridData: ScheduleGridData, data: ExportData): XLSX.WorkSheet {
    const worksheetData: any[][] = [];
    const processedRows = new Set<string>(); // ✅ Para evitar filas duplicadas

    // Headers
    const headers = ['Turno', 'Hora', 'Duración', ...WORKING_DAYS.map(day => DAY_NAMES[day])];
    worksheetData.push(headers);

    // Add schedule data
    gridData.timeSlots.forEach(timeSlot => {
      timeSlot.hours.forEach(hour => {
        // ✅ Crear clave única para detectar duplicados
        const rowKey = `${timeSlot.name}-${hour.order}-${hour.startTime}`;

        if (processedRows.has(rowKey)) {
          console.warn(`⚠️ Skipping duplicate row: ${rowKey}`);
          return; // Saltar fila duplicada
        }

        processedRows.add(rowKey);

        const row = [
          timeSlot.name,
          `${hour.startTime} - ${hour.endTime}`,
          `${hour.duration} min`
        ];

        WORKING_DAYS.forEach(day => {
          const cellData = gridData.schedule[timeSlot.name]?.[hour.order]?.[day];

          if (cellData?.hasSession) {
            if (data.exportType === 'teacher') {
              row.push(`${cellData.courseName} | ${cellData.groupName} | ${cellData.spaceName}`);
            } else {
              row.push(`${cellData.courseName} | ${cellData.teacherName} | ${cellData.spaceName}`);
            }
          } else {
            row.push('');
          }
        });

        worksheetData.push(row);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Turno
      { wch: 20 }, // Hora
      { wch: 12 }, // Duración
      ...WORKING_DAYS.map(() => ({ wch: 30 })) // Días
    ];
    worksheet['!cols'] = colWidths;

    return worksheet;
  }

  private createSummaryWorksheet(data: ExportData): XLSX.WorkSheet {
    const summaryData = [
      ['RESUMEN DEL HORARIO'],
      [''],
      ['Información General'],
      [data.exportType === 'teacher' ? 'Docente:' : 'Grupo:',
        data.exportType === 'teacher' ? (data.entity as TeacherResponse).fullName : (data.entity as StudentGroupResponse).name],
      ['Total de clases:', data.metadata?.totalSessions || 0],
      ['Total de horas:', data.metadata?.totalHours || 0],
      ['Fecha de generación:', data.metadata?.generatedAt.toLocaleDateString('es-ES') || new Date().toLocaleDateString('es-ES')],
      [''],
      ['Distribución por día']
    ];

    // Add distribution by day
    const sessionsByDay = this.getSessionsByDay(data.sessions);
    WORKING_DAYS.forEach(day => {
      const dayName = DAY_NAMES[day];
      const dayCount = sessionsByDay[day]?.length || 0;
      const dayHours = sessionsByDay[day]?.reduce((sum, session) => sum + session.totalHours, 0) || 0;
      summaryData.push([dayName, `${dayCount} clases`, `${dayHours} horas`]);
    });

    return XLSX.utils.aoa_to_sheet(summaryData);
  }

  private createSessionsDetailWorksheet(sessions: ClassSessionResponse[], exportType: 'teacher' | 'group'): XLSX.WorkSheet {
    const headers = [
      'Día',
      'Hora Inicio',
      'Hora Fin',
      'Curso',
      exportType === 'teacher' ? 'Grupo' : 'Docente',
      'Aula',
      'Tipo',
      'Horas Pedagógicas',
      'Observaciones'
    ];

    const detailData = [headers];

    sessions.forEach(session => {
      const sortedHours = [...session.teachingHours].sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);
      const startTime = sortedHours[0]?.startTime || '';
      const endTime = sortedHours[sortedHours.length - 1]?.endTime || '';

      detailData.push([
        DAY_NAMES[session.dayOfWeek],
        startTime,
        endTime,
        session.course.name,
        exportType === 'teacher' ? session.studentGroup.name : session.teacher.fullName,
        session.learningSpace.name,
        session.sessionType.name === 'THEORY' ? 'Teórica' : 'Práctica',
        session.totalHours.toString(),
        session.notes || ''
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(detailData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Día
      { wch: 12 }, // Hora Inicio
      { wch: 12 }, // Hora Fin
      { wch: 25 }, // Curso
      { wch: 20 }, // Grupo/Docente
      { wch: 15 }, // Aula
      { wch: 10 }, // Tipo
      { wch: 8 },  // Horas
      { wch: 30 }  // Observaciones
    ];

    return worksheet;
  }

  // ===== MÉTODOS AUXILIARES =====

  private generateScheduleGrid(sessions: ClassSessionResponse[]): ScheduleGridData {
    const timeSlots = new Map<string, any>();
    const schedule: any = {};

    // ✅ CORRECCIÓN PRINCIPAL: Procesar sesiones una sola vez
    sessions.forEach(session => {
      const timeSlotKey = session.timeSlotName;

      // Inicializar timeSlot si no existe
      if (!timeSlots.has(timeSlotKey)) {
        // ✅ Obtener info del timeSlot desde la primera hora
        const firstHour = session.teachingHours[0];
        timeSlots.set(timeSlotKey, {
          name: timeSlotKey,
          startTime: firstHour.startTime,
          endTime: firstHour.endTime,
          hours: new Set()
        });
        schedule[timeSlotKey] = {};
      }

      const timeSlot = timeSlots.get(timeSlotKey);

      // ✅ CORRECCIÓN: Procesar cada hora pedagógica de la sesión
      session.teachingHours.forEach(hour => {
        // Agregar la hora al Set (evita duplicados automáticamente)
        timeSlot.hours.add({
          order: hour.orderInTimeSlot,
          startTime: hour.startTime,
          endTime: hour.endTime,
          duration: hour.durationMinutes
        });

        // Inicializar estructura de horario para esta hora
        if (!schedule[timeSlotKey][hour.orderInTimeSlot]) {
          schedule[timeSlotKey][hour.orderInTimeSlot] = {};
        }

        // ✅ IMPORTANTE: Solo agregar la sesión UNA VEZ por día
        // (no una vez por cada hora pedagógica)
        if (!schedule[timeSlotKey][hour.orderInTimeSlot][session.dayOfWeek]) {
          schedule[timeSlotKey][hour.orderInTimeSlot][session.dayOfWeek] = {
            courseName: session.course.name,
            teacherName: session.teacher.fullName,
            groupName: session.studentGroup.name,
            spaceName: session.learningSpace.name,
            sessionType: session.sessionType.name,
            hasSession: true
          };
        }
      });
    });

    // ✅ CORRECCIÓN: Mejor manejo de la conversión final
    const finalTimeSlots = Array.from(timeSlots.values()).map(ts => {
      // Convertir Set a Array y ordenar
      const hoursArray = Array.from(ts.hours);

      // ✅ IMPORTANTE: Eliminar duplicados por orderInTimeSlot
      const uniqueHours = hoursArray.reduce((acc: any[], current: any) => {
        const exists = acc.find(h => h.order === current.order);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      return {
        ...ts,
        hours: uniqueHours.sort((a: any, b: any) => a.order - b.order)
      };
    });

    console.log('🔍 Generated grid data:', {
      timeSlots: finalTimeSlots.length,
      totalUniqueHours: finalTimeSlots.reduce((sum, ts) => sum + ts.hours.length, 0),
      schedule: Object.keys(schedule).length
    });

    return {
      timeSlots: finalTimeSlots,
      schedule
    };
  }

  private generateFilename(data: ExportData, extension: 'pdf' | 'xlsx'): string {
    const date = new Date().toISOString().split('T')[0];
    const entityName = data.exportType === 'teacher'
      ? (data.entity as TeacherResponse).fullName
      : (data.entity as StudentGroupResponse).name;

    const cleanName = entityName.replace(/[^a-zA-Z0-9]/g, '_');
    const type = data.exportType === 'teacher' ? 'Docente' : 'Grupo';

    return `Horario_${type}_${cleanName}_${date}.${extension}`;
  }

  private getSessionsByDay(sessions: ClassSessionResponse[]): { [day in DayOfWeek]?: ClassSessionResponse[] } {
    const sessionsByDay: { [day in DayOfWeek]?: ClassSessionResponse[] } = {};

    sessions.forEach(session => {
      if (!sessionsByDay[session.dayOfWeek]) {
        sessionsByDay[session.dayOfWeek] = [];
      }
      sessionsByDay[session.dayOfWeek]!.push(session);
    });

    return sessionsByDay;
  }
}
