import { LocationInput, type LocationField } from '@glyde/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { NearestStop } from '@/features/location/useNearestStop';
import type { FieldId, TripPlanner } from '../hooks/useTripPlanner';

import { Suggestions } from './Suggestions';

type Props = {
  planner: TripPlanner;
  nearest: NearestStop | null;
  recentIds: string[];
  onChosen: (stopId: string) => void;
  /** Rendered under the inputs when no field is being edited (results). */
  children?: ReactNode;
};

/** uix-spec 2.3 Trip Search: pickup + drop-off(s) with '+', suggestions while a field is active. */
export function TripSearch({ planner, nearest, recentIds, onChosen, children }: Props) {
  const name = (id: string | undefined) => (id ? (planner.stopById.get(id)?.name ?? '') : '');

  const fields: LocationField[] = [
    {
      id: 'pickup',
      kind: 'pickup',
      text:
        planner.active === 'pickup'
          ? planner.query
          : planner.pickup?.viaCurrentLocation
            ? `Current location · ${name(planner.pickup.stopId)}`
            : name(planner.pickup?.stopId),
      placeholder: 'Pickup stop',
      accessibilityLabel: 'Pickup stop',
    },
    ...planner.dropoffs.map((d, i): LocationField => {
      const id: FieldId = `dropoff-${d.key}`;
      return {
        id,
        kind: 'dropoff',
        text: planner.active === id ? planner.query : name(d.choice?.stopId),
        placeholder: i === 0 ? 'Where to?' : 'Another passenger’s stop',
        accessibilityLabel: i === 0 ? 'Drop-off stop' : `Drop-off stop for passenger ${i + 1}`,
        removable: i > 0,
      };
    }),
  ];

  return (
    <View style={styles.root}>
      <LocationInput
        fields={fields}
        activeId={planner.active}
        onFocusField={(id) => planner.focus(id as FieldId)}
        onChangeText={(_, t) => planner.setQuery(t)}
        onAddStop={planner.addStop}
        onRemoveStop={(id) => planner.removeStop(id as FieldId)}
      />
      {planner.active ? (
        <Suggestions
          query={planner.query}
          candidates={planner.candidates}
          recentIds={recentIds}
          nearest={planner.active === 'pickup' ? nearest : null}
          onChoose={(stop, via) => {
            planner.choose(stop, via);
            onChosen(stop.id);
          }}
        />
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: 0 } });
