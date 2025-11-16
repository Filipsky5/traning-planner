import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkoutDetail } from './useWorkoutDetail';
import type { WorkoutDetailDto, WorkoutCompleteCommand, ApiResponse } from '@/types';

// Mock global fetch
const mockFetch = vi.fn();

describe('useWorkoutDetail', () => {
  const mockWorkoutDto: WorkoutDetailDto = {
    id: 'workout-1',
    user_id: 'user-1',
    training_type_code: 'easy_run',
    planned_date: '2024-01-15',
    position: 1,
    planned_distance_m: 5000,
    planned_duration_s: 1800,
    distance_m: null,
    duration_s: null,
    avg_hr_bpm: null,
    avg_pace_s_per_km: null,
    rating: null,
    status: 'planned',
    origin: 'manual',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
    completed_at: null,
    steps: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockResponse = (data: any, ok = true, status = 200) => {
    return Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(data),
    } as Response);
  };

  describe('Initialization', () => {
    it('should initialize with null workout and no loading when workoutId is null', () => {
      const { result } = renderHook(() => useWorkoutDetail(null));

      expect(result.current.workout).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should start loading when workoutId is provided', async () => {
      const mockResponse: ApiResponse<WorkoutDetailDto> = { data: mockWorkoutDto };
      mockFetch.mockReturnValueOnce(createMockResponse(mockResponse));

      const { result } = renderHook(() => useWorkoutDetail('workout-1'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch workout data successfully', async () => {
      const mockResponse: ApiResponse<WorkoutDetailDto> = { data: mockWorkoutDto };
      mockFetch.mockReturnValueOnce(createMockResponse(mockResponse));

      const { result } = renderHook(() => useWorkoutDetail('workout-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/workouts/workout-1',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result.current.workout).not.toBeNull();
      expect(result.current.workout?.id).toBe('workout-1');
      expect(result.current.workout?.detail).toEqual(mockWorkoutDto);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse({}, false, 500));

      const { result } = renderHook(() => useWorkoutDetail('workout-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.workout).toBeNull();
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Błąd pobierania danych');
    });

    it('should not fetch when workoutId is null', () => {
      renderHook(() => useWorkoutDetail(null));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should transform DTO to view model correctly', async () => {
      const mockResponse: ApiResponse<WorkoutDetailDto> = { data: mockWorkoutDto };
      mockFetch.mockReturnValueOnce(createMockResponse(mockResponse));

      const { result } = renderHook(() => useWorkoutDetail('workout-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.workout).toMatchObject({
        id: 'workout-1',
        status: 'planned',
        origin: 'manual',
        trainingTypeCode: 'easy_run',
        plannedDateFormatted: expect.any(String),
      });
    });
  });

  describe('Complete Workout', () => {
    it('should complete workout successfully', async () => {
      const completedWorkout: WorkoutDetailDto = {
        ...mockWorkoutDto,
        status: 'completed',
        distance_m: 5100,
        duration_s: 1750,
        avg_hr_bpm: 145,
        avg_pace_s_per_km: 343,
        rating: 'just_right',
        completed_at: '2024-01-15T10:00:00Z',
      };

      const mockResponse: ApiResponse<WorkoutDetailDto> = { data: mockWorkoutDto };
      const completedResponse: ApiResponse<WorkoutDetailDto> = { data: completedWorkout };

      mockFetch
        .mockReturnValueOnce(createMockResponse(mockResponse)) // initial fetch
        .mockReturnValueOnce(createMockResponse({})) // complete call
        .mockReturnValueOnce(createMockResponse(completedResponse)); // refetch call

      const { result } = renderHook(() => useWorkoutDetail('workout-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const completeCommand: WorkoutCompleteCommand = {
        distance_m: 5100,
        duration_s: 1750,
        avg_hr_bpm: 145,
        completed_at: '2024-01-15T10:00:00Z',
        rating: 'just_right',
      };

      await result.current.completeWorkout(completeCommand);

      await waitFor(() => {
        expect(result.current.workout?.status).toBe('completed');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/workouts/workout-1/complete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(completeCommand),
        })
      );
    });

    it('should handle completion errors', async () => {
      const mockResponse: ApiResponse<WorkoutDetailDto> = { data: mockWorkoutDto };

      mockFetch
        .mockReturnValueOnce(createMockResponse(mockResponse))
        .mockReturnValueOnce(createMockResponse({}, false, 500));

      const { result } = renderHook(() => useWorkoutDetail('workout-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const completeCommand: WorkoutCompleteCommand = {
        distance_m: 5100,
        duration_s: 1750,
        avg_hr_bpm: 145,
        completed_at: '2024-01-15T10:00:00Z',
      };

      await expect(result.current.completeWorkout(completeCommand)).rejects.toThrow();
    });
  });

  describe('Refetch', () => {
    it('should refetch workout data', async () => {
      const mockResponse: ApiResponse<WorkoutDetailDto> = { data: mockWorkoutDto };
      mockFetch
        .mockReturnValueOnce(createMockResponse(mockResponse))
        .mockReturnValueOnce(createMockResponse(mockResponse));

      const { result } = renderHook(() => useWorkoutDetail('workout-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      result.current.refetch();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle workoutId change from null to valid ID', async () => {
      const mockResponse: ApiResponse<WorkoutDetailDto> = { data: mockWorkoutDto };
      mockFetch.mockReturnValueOnce(createMockResponse(mockResponse));

      const { result, rerender } = renderHook(
        ({ id }) => useWorkoutDetail(id),
        {
          initialProps: { id: null as string | null },
        }
      );

      expect(result.current.workout).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();

      rerender({ id: 'workout-1' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/workouts/workout-1',
        expect.any(Object)
      );
      expect(result.current.workout).not.toBeNull();
    });

    it('should handle workout with all completed fields', async () => {
      const completedWorkout: WorkoutDetailDto = {
        ...mockWorkoutDto,
        status: 'completed',
        distance_m: 5100,
        duration_s: 1750,
        avg_hr_bpm: 145,
        avg_pace_s_per_km: 343,
        rating: 'just_right',
        completed_at: '2024-01-15T10:00:00Z',
      };

      const mockResponse: ApiResponse<WorkoutDetailDto> = { data: completedWorkout };
      mockFetch.mockReturnValueOnce(createMockResponse(mockResponse));

      const { result } = renderHook(() => useWorkoutDetail('workout-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.workout?.status).toBe('completed');
      expect(result.current.workout?.rating).toBe('just_right');
      expect(result.current.workout?.distanceFormatted).toBeTruthy();
      expect(result.current.workout?.durationFormatted).toBeTruthy();
    });
  });
});
