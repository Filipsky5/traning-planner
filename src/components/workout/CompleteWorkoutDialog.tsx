import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { DurationInput, type DurationState } from '../onboarding/DurationInput';
import type { WorkoutCompleteCommand } from '../../types';

interface CompleteWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WorkoutCompleteCommand) => Promise<void>;
}

/**
 * Dialog do wprowadzania metryk ukończonego treningu
 * Formularz z walidacją dla distance_m, duration_s, avg_hr_bpm, completed_at, rating
 */
export function CompleteWorkoutDialog({
  open,
  onOpenChange,
  onSubmit,
}: CompleteWorkoutDialogProps) {
  // Stan formularza
  const [distanceKm, setDistanceKm] = useState('');
  const [duration, setDuration] = useState<DurationState>({
    hours: '',
    minutes: '',
    seconds: '',
  });
  const [avgHr, setAvgHr] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [completedTime, setCompletedTime] = useState('');
  const [rating, setRating] = useState<'too_easy' | 'just_right' | 'too_hard' | ''>('');

  // Stan walidacji
  const [errors, setErrors] = useState<{
    distance?: string;
    duration?: string;
    avgHr?: string;
    completedAt?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Walidacja formularza
   */
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    // Dystans: min 0.1 km (100m), max 100 km (100000m)
    const distance = parseFloat(distanceKm);
    if (isNaN(distance) || distance < 0.1 || distance > 100) {
      newErrors.distance = 'Dystans musi być między 0.1 a 100 km';
    }

    // Czas: min 5 min (300s), max 6h (21600s)
    const hours = parseInt(duration.hours) || 0;
    const minutes = parseInt(duration.minutes) || 0;
    const seconds = parseInt(duration.seconds) || 0;
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    if (totalSeconds < 300) {
      newErrors.duration = 'Czas musi być dłuższy niż 5 minut';
    } else if (totalSeconds > 21600) {
      newErrors.duration = 'Czas nie może przekraczać 6 godzin';
    }

    // Tętno: 0-240 bpm
    const hr = parseInt(avgHr);
    if (isNaN(hr) || hr < 0 || hr > 240) {
      newErrors.avgHr = 'Tętno musi być w zakresie 0-240 bpm';
    }

    // Data i czas ukończenia
    if (!completedDate || !completedTime) {
      newErrors.completedAt = 'Data i godzina ukończenia są wymagane';
    } else {
      const completedAt = new Date(`${completedDate}T${completedTime}`);
      const now = new Date();

      if (completedAt > now) {
        newErrors.completedAt = 'Data ukończenia nie może być w przyszłości';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Obsługa wysyłania formularza
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Transformacja danych
      const distance_m = Math.round(parseFloat(distanceKm) * 1000);
      const duration_s =
        (parseInt(duration.hours) || 0) * 3600 +
        (parseInt(duration.minutes) || 0) * 60 +
        (parseInt(duration.seconds) || 0);
      const avg_hr_bpm = parseInt(avgHr);
      const completed_at = new Date(`${completedDate}T${completedTime}`).toISOString();

      const data: WorkoutCompleteCommand = {
        distance_m,
        duration_s,
        avg_hr_bpm,
        completed_at,
        ...(rating && { rating }), // Dodaj rating tylko jeśli wybrano
      };

      await onSubmit(data);

      // Reset formularza po sukcesie
      setDistanceKm('');
      setDuration({ hours: '', minutes: '', seconds: '' });
      setAvgHr('');
      setCompletedDate('');
      setCompletedTime('');
      setRating('');
      setErrors({});

      onOpenChange(false);
    } catch (error) {
      // Błąd będzie obsłużony przez parent component
      console.error('Error in CompleteWorkoutDialog:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resetuj formularz przy zamknięciu
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      // Reset tylko przy zamykaniu (nie przy otwieraniu)
      setDistanceKm('');
      setDuration({ hours: '', minutes: '', seconds: '' });
      setAvgHr('');
      setCompletedDate('');
      setCompletedTime('');
      setRating('');
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  // Ustaw domyślną datę i czas na teraz (przy pierwszym otwarciu)
  if (open && !completedDate && !completedTime) {
    const now = new Date();
    setCompletedDate(now.toISOString().split('T')[0]);
    setCompletedTime(now.toTimeString().slice(0, 5));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ukończ trening</DialogTitle>
          <DialogDescription>
            Wprowadź metryki swojego ukończonego treningu
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Dystans */}
            <div className="space-y-2">
              <Label htmlFor="distance">
                Dystans (km) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="distance"
                type="number"
                step="0.01"
                value={distanceKm}
                onChange={(e) => {
                  setDistanceKm(e.target.value);
                  setErrors((prev) => ({ ...prev, distance: undefined }));
                }}
                placeholder="np. 5.50"
                disabled={isSubmitting}
                className={errors.distance ? 'border-red-500' : ''}
              />
              {errors.distance && (
                <p className="text-sm text-red-600">{errors.distance}</p>
              )}
            </div>

            {/* Czas trwania */}
            <div className="space-y-2">
              <Label>
                Czas trwania <span className="text-red-500">*</span>
              </Label>
              <DurationInput
                value={duration}
                onChange={(newDuration) => {
                  setDuration(newDuration);
                  setErrors((prev) => ({ ...prev, duration: undefined }));
                }}
                disabled={isSubmitting}
              />
              {errors.duration && (
                <p className="text-sm text-red-600">{errors.duration}</p>
              )}
            </div>

            {/* Średnie tętno */}
            <div className="space-y-2">
              <Label htmlFor="avgHr">
                Średnie tętno (bpm) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="avgHr"
                type="number"
                value={avgHr}
                onChange={(e) => {
                  setAvgHr(e.target.value);
                  setErrors((prev) => ({ ...prev, avgHr: undefined }));
                }}
                placeholder="np. 145"
                disabled={isSubmitting}
                className={errors.avgHr ? 'border-red-500' : ''}
              />
              {errors.avgHr && (
                <p className="text-sm text-red-600">{errors.avgHr}</p>
              )}
            </div>

            {/* Data ukończenia */}
            <div className="space-y-2">
              <Label htmlFor="completedDate">
                Data ukończenia <span className="text-red-500">*</span>
              </Label>
              <Input
                id="completedDate"
                type="date"
                value={completedDate}
                onChange={(e) => {
                  setCompletedDate(e.target.value);
                  setErrors((prev) => ({ ...prev, completedAt: undefined }));
                }}
                max={new Date().toISOString().split('T')[0]}
                disabled={isSubmitting}
                className={errors.completedAt ? 'border-red-500' : ''}
              />
            </div>

            {/* Godzina ukończenia */}
            <div className="space-y-2">
              <Label htmlFor="completedTime">
                Godzina ukończenia <span className="text-red-500">*</span>
              </Label>
              <Input
                id="completedTime"
                type="time"
                value={completedTime}
                onChange={(e) => {
                  setCompletedTime(e.target.value);
                  setErrors((prev) => ({ ...prev, completedAt: undefined }));
                }}
                disabled={isSubmitting}
                className={errors.completedAt ? 'border-red-500' : ''}
              />
              {errors.completedAt && (
                <p className="text-sm text-red-600">{errors.completedAt}</p>
              )}
            </div>

            {/* Ocena (opcjonalna) */}
            <div className="space-y-2">
              <Label>Ocena treningu (opcjonalna)</Label>
              <RadioGroup value={rating} onValueChange={(val) => setRating(val as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="too_easy" id="too_easy" disabled={isSubmitting} />
                  <Label htmlFor="too_easy" className="font-normal cursor-pointer">
                    Za łatwy
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="just_right" id="just_right" disabled={isSubmitting} />
                  <Label htmlFor="just_right" className="font-normal cursor-pointer">
                    W sam raz
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="too_hard" id="too_hard" disabled={isSubmitting} />
                  <Label htmlFor="too_hard" className="font-normal cursor-pointer">
                    Za trudny
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
