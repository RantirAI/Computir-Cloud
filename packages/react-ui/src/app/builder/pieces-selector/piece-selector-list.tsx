import { useDebounce } from 'use-debounce';
import {
  useBuilderStateContext,
} from '@/app/builder/builder-hooks';
import { SidebarHeader } from '@/app/builder/sidebar-header';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/spinner';
import { PieceStepMetadata, StepMetadata, piecesHooks } from '@/features/pieces/lib/pieces-hook';
import { PieceCardInfo } from '../../../features/pieces/components/piece-selector-card';
import { Action, ActionType, CodeAction, FlowOperationType, PieceAction, Trigger, TriggerType, deepMergeAndCast, flowHelper, isNil } from '@activepieces/shared';
import { UNSAVED_CHANGES_TOAST, toast } from '@/components/ui/use-toast';
import { useEffect } from 'react';
import { pieceSelectorUtils } from './piece-selector-utils';


const PiecesSelectorList = () => {
  const [searchQuery, setSearchQuery] = useDebounce<string>('', 300);

  const [exitPieceSelector, applyOperation, selectedButton, flowVersion, selectStep] = useBuilderStateContext(
    (state) => [state.exitPieceSelector, state.applyOperation, state.selectedButton, state.flowVersion, state.selectStep],
  );

  const { metadata, isLoading, refetch } = piecesHooks.useAllStepsMetadata({
    searchQuery,
    type: selectedButton?.type!,
    enabled: !isNil(selectedButton),
  });

  useEffect(() => {
    refetch();
  }, [selectedButton]);


  function getStepName(piece: StepMetadata) {
    if (piece.type === TriggerType.PIECE) {
      return 'trigger';
    }
    const baseName = 'step_'
    let number = 1;
    const steps = flowHelper.getAllSteps(flowVersion.trigger);
    while (steps.some((step) => step.name === `${baseName}${number}`)) {
      number++;
    }
    return `${baseName}${number}`;
  }


  function handleClick(piece: StepMetadata) {
    if (!selectedButton) {
      return;
    }
    const stepName = getStepName(piece);
    const defaultStep = pieceSelectorUtils.getDefaultStep(stepName, piece);
    if (piece.type === TriggerType.PIECE) {
      console.log(defaultStep);
      applyOperation({
        type: FlowOperationType.UPDATE_TRIGGER,
        request: defaultStep as Trigger,
      }, () => toast(UNSAVED_CHANGES_TOAST));
    } else {
      applyOperation({
        type: FlowOperationType.ADD_ACTION,
        request: {
          parentStep: selectedButton.stepname,
          stepLocationRelativeToParent: selectedButton.relativeLocation,
          action: defaultStep as Action,
        },
      }, () => toast(UNSAVED_CHANGES_TOAST));
    }
    // TODO pick the default path
    selectStep({
      path: [],
      stepName: defaultStep.name,
    });
  }

  function toKey(stepMetadata: StepMetadata): string {
    switch (stepMetadata.type) {
      case ActionType.PIECE:
      case TriggerType.PIECE: {
        const pieceMetadata: PieceStepMetadata = stepMetadata as PieceStepMetadata;
        return `${stepMetadata.type}-${pieceMetadata.pieceName}-${pieceMetadata.pieceVersion}`;
      }
      default:
        return stepMetadata.displayName.toLowerCase();
    }
  }
  return (
    <>
      <SidebarHeader onClose={() => exitPieceSelector()}>
        {selectedButton?.type === 'action' ? 'Select Action' : 'Select Trigger'}
      </SidebarHeader>
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="w-full">
          <Input
            type="text"
            placeholder="Search for a piece"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isLoading && (
          <div className="flex h-full grow items-center justify-center text-center">
            <LoadingSpinner />
          </div>
        )}
        {metadata && metadata.length === 0 && (
          <div className="flex h-full grow items-center justify-center text-center">
            No pieces found
          </div>
        )}
        {!isLoading && metadata && metadata.length > 0 && (
          // TODO check scrolling it doesn't show the last piece
          <ScrollArea>
            <div className="flex h-max flex-col gap-4">
              {metadata &&
                metadata.map((stepMetadata) => (
                  <PieceCardInfo piece={stepMetadata} key={toKey(stepMetadata)} interactive={true} onClick={() => handleClick(stepMetadata)} />
                ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  );
};

export { PiecesSelectorList };