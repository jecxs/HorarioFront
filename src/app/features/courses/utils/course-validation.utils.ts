// src/app/features/courses/utils/course-validation.utils.ts
import { AbstractControl, ValidationErrors } from '@angular/forms';

export class CourseValidationUtils {

  /**
   * Valida que el código del curso tenga un formato válido
   */
  static codeFormatValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const code = control.value.toString().trim();

    // Formato esperado: ABC-123 o ABC123
    const codePattern = /^[A-Z]{2,4}[-]?[0-9]{2,3}$/;

    if (!codePattern.test(code)) {
      return {
        invalidCodeFormat: {
          message: 'El código debe tener el formato ABC-123 o ABC123'
        }
      };
    }

    return null;
  }

  /**
   * Valida que al menos una hora (teórica o práctica) sea mayor a 0
   */
  static atLeastOneHourValidator(control: AbstractControl): ValidationErrors | null {
    const theoryHours = control.get('weeklyTheoryHours')?.value || 0;
    const practiceHours = control.get('weeklyPracticeHours')?.value || 0;

    if (theoryHours + practiceHours === 0) {
      return {
        noHours: {
          message: 'Debe asignar al menos 1 hora semanal (teórica o práctica)'
        }
      };
    }

    return null;
  }

  /**
   * Valida que las horas totales no excedan un máximo razonable
   */
  static maxTotalHoursValidator(maxHours: number = 10) {
    return (control: AbstractControl): ValidationErrors | null => {
      const theoryHours = control.get('weeklyTheoryHours')?.value || 0;
      const practiceHours = control.get('weeklyPracticeHours')?.value || 0;
      const totalHours = theoryHours + practiceHours;

      if (totalHours > maxHours) {
        return {
          maxTotalHours: {
            message: `Las horas totales no pueden exceder ${maxHours} por semana`,
            actualHours: totalHours,
            maxHours
          }
        };
      }

      return null;
    };
  }

  /**
   * Valida que si hay horas prácticas, se requiera una especialidad
   */
  static practiceSpecialtyValidator(control: AbstractControl): ValidationErrors | null {
    const practiceHours = control.get('weeklyPracticeHours')?.value || 0;
    const specialtyUuid = control.get('preferredSpecialtyUuid')?.value;

    if (practiceHours > 0 && !specialtyUuid) {
      return {
        practiceWithoutSpecialty: {
          message: 'Los cursos con horas prácticas deben tener una especialidad asignada'
        }
      };
    }

    return null;
  }

  /**
   * Valida que el nombre del curso no contenga caracteres especiales problemáticos
   */
  static courseNameValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const name = control.value.toString().trim();

    // Permitir letras, números, espacios, guiones, paréntesis y puntos
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-().]+$/;

    if (!namePattern.test(name)) {
      return {
        invalidCourseName: {
          message: 'El nombre del curso contiene caracteres no válidos'
        }
      };
    }

    // Validar longitud mínima
    if (name.length < 3) {
      return {
        courseNameTooShort: {
          message: 'El nombre del curso debe tener al menos 3 caracteres'
        }
      };
    }

    return null;
  }

  /**
   * Valida que las horas prácticas sean coherentes con el tipo de curso
   */
  static coherentHoursValidator(control: AbstractControl): ValidationErrors | null {
    const theoryHours = control.get('weeklyTheoryHours')?.value || 0;
    const practiceHours = control.get('weeklyPracticeHours')?.value || 0;

    // Si es un curso puramente teórico, advertir si hay muchas horas
    if (theoryHours > 6 && practiceHours === 0) {
      return {
        warningTooManyTheoryHours: {
          message: 'Advertencia: Muchas horas teóricas para un curso sin práctica',
          isWarning: true
        }
      };
    }

    // Si es un curso puramente práctico, advertir si hay muchas horas
    if (practiceHours > 6 && theoryHours === 0) {
      return {
        warningTooManyPracticeHours: {
          message: 'Advertencia: Muchas horas prácticas sin base teórica',
          isWarning: true
        }
      };
    }

    return null;
  }

  /**
   * Valida distribución balanceada de horas para cursos mixtos
   */
  static balancedHoursValidator(control: AbstractControl): ValidationErrors | null {
    const theoryHours = control.get('weeklyTheoryHours')?.value || 0;
    const practiceHours = control.get('weeklyPracticeHours')?.value || 0;

    // Solo validar si ambos tipos de horas están presentes
    if (theoryHours > 0 && practiceHours > 0) {
      const ratio = theoryHours / practiceHours;

      // Advertir si la relación es muy desbalanceada (más de 4:1 en cualquier dirección)
      if (ratio > 4 || ratio < 0.25) {
        return {
          unbalancedHours: {
            message: 'Advertencia: Distribución muy desbalanceada entre teoría y práctica',
            ratio: ratio,
            isWarning: true
          }
        };
      }
    }

    return null;
  }
}

// src/app/features/courses/utils/course-format.utils.ts
export class CourseFormatUtils {

  /**
   * Formatea el código del curso a mayúsculas y con guión
   */
  static formatCourseCode(code: string): string {
    if (!code) return '';

    const cleanCode = code.replace(/\s+/g, '').toUpperCase();

    // Si ya tiene guión, dejarlo así
    if (cleanCode.includes('-')) {
      return cleanCode;
    }

    // Buscar la transición de letras a números
    const match = cleanCode.match(/^([A-Z]+)([0-9]+)$/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }

    return cleanCode;
  }

  /**
   * Formatea el nombre del curso con capitalización adecuada
   */
  static formatCourseName(name: string): string {
    if (!name) return '';

    return name
      .toLowerCase()
      .split(' ')
      .map(word => {
        // Palabras que no se capitalizan (excepto al inicio)
        const lowercaseWords = ['a', 'al', 'de', 'del', 'en', 'la', 'las', 'el', 'los', 'para', 'por', 'con', 'y', 'o'];
        return lowercaseWords.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ')
      .replace(/^\w/, c => c.toUpperCase()); // Asegurar que la primera palabra esté capitalizada
  }

  /**
   * Genera sugerencias de código basado en el nombre del curso
   */
  static suggestCourseCode(courseName: string): string[] {
    if (!courseName) return [];

    const words = courseName.trim().split(/\s+/);
    const suggestions: string[] = [];

    // Tomar las primeras letras de cada palabra
    if (words.length >= 2) {
      const initials = words.map(word => word.charAt(0).toUpperCase()).join('');
      suggestions.push(`${initials}-001`);
      suggestions.push(`${initials}-101`);
    }

    // Usar la primera palabra completa si es corta
    if (words[0] && words[0].length <= 4) {
      suggestions.push(`${words[0].toUpperCase()}-001`);
      suggestions.push(`${words[0].toUpperCase()}-101`);
    }

    // Usar abreviaciones comunes
    const abbreviations: { [key: string]: string } = {
      'programacion': 'PROG',
      'algoritmos': 'ALG',
      'matematicas': 'MAT',
      'calculo': 'CAL',
      'fisica': 'FIS',
      'quimica': 'QUI',
      'biologia': 'BIO',
      'historia': 'HIST',
      'geografia': 'GEO',
      'ingles': 'ENG',
      'español': 'ESP',
      'literatura': 'LIT',
      'economia': 'ECO',
      'contabilidad': 'CONT',
      'administracion': 'ADM',
      'sistemas': 'SIS',
      'redes': 'RED',
      'base': 'BD',
      'datos': 'BD',
      'software': 'SW',
      'hardware': 'HW',
      'web': 'WEB',
      'movil': 'MOV',
      'android': 'AND',
      'ios': 'IOS',
      'javascript': 'JS',
      'python': 'PY',
      'java': 'JAVA',
      'csharp': 'CS',
      'php': 'PHP'
    };

    const lowerName = courseName.toLowerCase();
    for (const [word, abbr] of Object.entries(abbreviations)) {
      if (lowerName.includes(word)) {
        suggestions.push(`${abbr}-001`);
        suggestions.push(`${abbr}-101`);
        break;
      }
    }

    // Remover duplicados y limitar a 5 sugerencias
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Valida si un código de curso es único en una lista existente
   */
  static isCodeUnique(code: string, existingCodes: string[], excludeCode?: string): boolean {
    if (!code) return false;

    const normalizedCode = code.toUpperCase().trim();
    const normalizedExisting = existingCodes
      .filter(c => c !== excludeCode)
      .map(c => c.toUpperCase().trim());

    return !normalizedExisting.includes(normalizedCode);
  }

  /**
   * Calcula estadísticas de horas para un conjunto de cursos
   */
  static calculateHourStatistics(courses: any[]): {
    totalTheoryHours: number;
    totalPracticeHours: number;
    totalHours: number;
    averageTheoryHours: number;
    averagePracticeHours: number;
    averageTotalHours: number;
    theoryCourses: number;
    practiceCourses: number;
    mixedCourses: number;
  } {
    if (!courses || courses.length === 0) {
      return {
        totalTheoryHours: 0,
        totalPracticeHours: 0,
        totalHours: 0,
        averageTheoryHours: 0,
        averagePracticeHours: 0,
        averageTotalHours: 0,
        theoryCourses: 0,
        practiceCourses: 0,
        mixedCourses: 0
      };
    }

    const totalTheoryHours = courses.reduce((sum, course) => sum + (course.weeklyTheoryHours || 0), 0);
    const totalPracticeHours = courses.reduce((sum, course) => sum + (course.weeklyPracticeHours || 0), 0);
    const totalHours = totalTheoryHours + totalPracticeHours;

    const theoryCourses = courses.filter(c =>
      (c.weeklyTheoryHours || 0) > 0 && (c.weeklyPracticeHours || 0) === 0
    ).length;

    const practiceCourses = courses.filter(c =>
      (c.weeklyTheoryHours || 0) === 0 && (c.weeklyPracticeHours || 0) > 0
    ).length;

    const mixedCourses = courses.filter(c =>
      (c.weeklyTheoryHours || 0) > 0 && (c.weeklyPracticeHours || 0) > 0
    ).length;

    return {
      totalTheoryHours,
      totalPracticeHours,
      totalHours,
      averageTheoryHours: Math.round((totalTheoryHours / courses.length) * 100) / 100,
      averagePracticeHours: Math.round((totalPracticeHours / courses.length) * 100) / 100,
      averageTotalHours: Math.round((totalHours / courses.length) * 100) / 100,
      theoryCourses,
      practiceCourses,
      mixedCourses
    };
  }

  /**
   * Genera un nombre de archivo para exportación
   */
  static generateExportFileName(prefix: string = 'cursos', format: string = 'xlsx'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${prefix}_${year}${month}${day}_${hours}${minutes}.${format}`;
  }

  /**
   * Valida datos de importación de cursos
   */
  static validateImportData(data: any[]): {
    valid: any[];
    invalid: { row: number; data: any; errors: string[] }[];
  } {
    const valid: any[] = [];
    const invalid: { row: number; data: any; errors: string[] }[] = [];

    data.forEach((row, index) => {
      const errors: string[] = [];

      // Validar campos requeridos
      if (!row.name || typeof row.name !== 'string' || row.name.trim() === '') {
        errors.push('Nombre del curso es requerido');
      }

      if (!row.code || typeof row.code !== 'string' || row.code.trim() === '') {
        errors.push('Código del curso es requerido');
      }

      if (!row.cycleUuid || typeof row.cycleUuid !== 'string') {
        errors.push('UUID del ciclo es requerido');
      }

      if (!row.knowledgeAreaUuid || typeof row.knowledgeAreaUuid !== 'string') {
        errors.push('UUID del área de conocimiento es requerido');
      }

      // Validar horas
      const theoryHours = parseFloat(row.weeklyTheoryHours) || 0;
      const practiceHours = parseFloat(row.weeklyPracticeHours) || 0;

      if (theoryHours < 0 || practiceHours < 0) {
        errors.push('Las horas no pueden ser negativas');
      }

      if (theoryHours + practiceHours === 0) {
        errors.push('Debe tener al menos 1 hora semanal');
      }

      if (theoryHours > 20 || practiceHours > 20) {
        errors.push('Las horas no pueden exceder 20 por tipo');
      }

      // Si hay errores, agregar a la lista de inválidos
      if (errors.length > 0) {
        invalid.push({
          row: index + 1,
          data: row,
          errors
        });
      } else {
        // Normalizar datos válidos
        valid.push({
          ...row,
          name: row.name.trim(),
          code: this.formatCourseCode(row.code.trim()),
          weeklyTheoryHours: theoryHours,
          weeklyPracticeHours: practiceHours,
          preferredSpecialtyUuid: row.preferredSpecialtyUuid || undefined
        });
      }
    });

    return { valid, invalid };
  }
}

// src/app/features/courses/utils/course-constants.ts
export const COURSE_CONSTANTS = {
  // Límites de horas
  MAX_WEEKLY_HOURS_PER_TYPE: 20,
  MAX_TOTAL_WEEKLY_HOURS: 10,
  MIN_WEEKLY_HOURS: 1,

  // Patrones de validación
  CODE_PATTERN: /^[A-Z]{2,4}[-]?[0-9]{2,3}$/,
  NAME_PATTERN: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-().]+$/,

  // Tipos de curso
  COURSE_TYPES: {
    THEORY: 'THEORY',
    PRACTICE: 'PRACTICE',
    MIXED: 'MIXED'
  } as const,

  // Colores para tipos de curso
  TYPE_COLORS: {
    THEORY: 'primary',
    PRACTICE: 'warn',
    MIXED: 'accent'
  } as const,

  // Iconos para tipos de curso
  TYPE_ICONS: {
    THEORY: 'menu_book',
    PRACTICE: 'science',
    MIXED: 'hub'
  } as const,

  // Mensajes de validación
  VALIDATION_MESSAGES: {
    REQUIRED_NAME: 'El nombre del curso es obligatorio',
    REQUIRED_CODE: 'El código del curso es obligatorio',
    REQUIRED_CYCLE: 'Debe seleccionar un ciclo',
    REQUIRED_KNOWLEDGE_AREA: 'Debe seleccionar un área de conocimiento',
    INVALID_CODE_FORMAT: 'El código debe tener el formato ABC-123',
    INVALID_NAME_CHARACTERS: 'El nombre contiene caracteres no válidos',
    NO_HOURS: 'Debe asignar al menos 1 hora semanal',
    TOO_MANY_HOURS: 'Las horas no pueden exceder el límite permitido',
    CODE_EXISTS: 'Este código ya está en uso',
    PRACTICE_NEEDS_SPECIALTY: 'Los cursos prácticos requieren especialidad'
  } as const,

  // Configuración de exportación
  EXPORT_CONFIG: {
    FORMATS: ['xlsx', 'csv', 'pdf'] as const,
    DEFAULT_FORMAT: 'xlsx' as const,
    FILENAME_PREFIX: 'cursos',
    COLUMNS: [
      'name',
      'code',
      'weeklyTheoryHours',
      'weeklyPracticeHours',
      'cycle',
      'career',
      'modality',
      'knowledgeArea',
      'specialty'
    ] as const
  }
};
