import { usePaceUnit } from './providers/PaceUnitProvider';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

/**
 * Komponent przełącznika jednostki tempa.
 * Wyświetla przełącznik Switch pozwalający wybierać między 'min/km' a 'km/h'.
 * Stan jest zarządzany globalnie przez PaceUnitProvider i synchronizowany z localStorage.
 */
export function PaceUnitToggle() {
  const { paceUnit, setPaceUnit } = usePaceUnit();

  // Switch będzie checked gdy jednostka to 'km/h'
  const isKmPerHour = paceUnit === 'km/h';

  const handleToggle = (checked: boolean) => {
    // checked = true -> 'km/h', checked = false -> 'min/km'
    setPaceUnit(checked ? 'km/h' : 'min/km');
  };

  return (
    <div className="flex items-center justify-between py-2 px-2">
      <Label htmlFor="pace-unit-switch" className="text-sm font-normal cursor-pointer">
        Jednostka tempa
      </Label>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${!isKmPerHour ? 'font-semibold' : 'text-muted-foreground'}`}>
          min/km
        </span>
        <Switch
          id="pace-unit-switch"
          checked={isKmPerHour}
          onCheckedChange={handleToggle}
        />
        <span className={`text-xs ${isKmPerHour ? 'font-semibold' : 'text-muted-foreground'}`}>
          km/h
        </span>
      </div>
    </div>
  );
}
