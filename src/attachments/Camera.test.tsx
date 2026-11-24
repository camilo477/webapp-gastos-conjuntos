import { act,cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { Camera } from './Camera';
const original = Object.getOwnPropertyDescriptor(navigator,'mediaDevices');
function devices(getUserMedia: () => Promise<MediaStream>) { Object.defineProperty(navigator,'mediaDevices',{ configurable: true,value: { getUserMedia } }); }
function stream() { const stop = vi.fn(); return { value: { getTracks: () => [{ stop }] } as unknown as MediaStream,stop }; }
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); if (original) Object.defineProperty(navigator,'mediaDevices',original); else Reflect.deleteProperty(navigator,'mediaDevices'); });
it('reports a stalled permission request and stops a stream granted after its deadline',async () => {
  vi.useFakeTimers(); const media = stream(); let grant!: (value: MediaStream) => void;
  devices(() => new Promise(resolve => { grant = resolve; }));
  render(<Camera capture={vi.fn()} close={vi.fn()} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(screen.getByRole('alert')).toHaveTextContent('no respondió a tiempo');
  await act(async () => { grant(media.value); });
  expect(media.stop).toHaveBeenCalledOnce(); expect(screen.getByRole('button',{ name: 'Tomar fotografía' })).toBeDisabled();
});
it('stops a stream whose playback never becomes ready and offers the file alternative',async () => {
  vi.useFakeTimers(); const media = stream(); devices(async () => media.value);
  vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(() => new Promise(() => {}));
  render(<Camera capture={vi.fn()} close={vi.fn()} />); await act(async () => {});
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(media.stop).toHaveBeenCalledOnce(); expect(screen.getByRole('alert')).toHaveTextContent('foto desde archivos');
  expect(screen.getByRole('button',{ name: 'Tomar fotografía' })).toBeDisabled();
});
it('a late playback receipt cannot enable a stopped camera after the app becomes hidden',async () => {
  const media = stream(); devices(async () => media.value); let playing!: () => void;
  vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(() => new Promise(resolve => { playing = resolve; }));
  render(<Camera capture={vi.fn()} close={vi.fn()} />); await act(async () => {});
  vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await act(async () => { playing(); });
  expect(media.stop).toHaveBeenCalledOnce(); expect(screen.getByRole('button',{ name: 'Tomar fotografía' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('se detuvo al salir');
});

it('a rejected playback from the previous camera cannot stop the replacement stream',async () => {
  const previous = stream(),replacement = stream(); let call = 0,rejectPrevious!: (error: Error) => void;
  devices(async () => (++call === 1 ? previous.value : replacement.value));
  vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementationOnce(() => new Promise((_resolve,reject) => { rejectPrevious = reject; })).mockResolvedValue(undefined);
  render(<Camera capture={vi.fn()} close={vi.fn()} />); await act(async () => {});
  fireEvent.click(screen.getByRole('button',{ name: 'Cambiar cámara' })); await act(async () => {});
  expect(screen.getByRole('button',{ name: 'Tomar fotografía' })).toBeEnabled();
  await act(async () => { rejectPrevious(new Error('Previous source stopped')); });
  expect(previous.stop).toHaveBeenCalledOnce(); expect(replacement.stop).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{ name: 'Tomar fotografía' })).toBeEnabled();
});
