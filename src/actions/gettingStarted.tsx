import * as React from 'react' // tslint:disable-line
import * as Relay from 'react-relay'
import {Example} from '../types/types'
import {Dispatch, StateTree, ReduxThunk, ReduxAction} from '../types/reducers'
import {GettingStartedState, Step} from './../types/gettingStarted'
import UpdateCustomerOnboardingStatusMutation from '../mutations/UpdateCustomerOnboardingStatusMutation'
import Constants from '../constants/gettingStarted'
import IconNotification from '../components/IconNotification/IconNotification'
import cuid from 'cuid'
import {showPopup} from '../actions/popup'

export function showDonePopup() {
  const id = cuid()
  const element = <IconNotification id={id}/>
  return showPopup({id, element, blurBackground: false})
}

export function selectExample(selectedExample: Example): (dispatch: (action: ReduxAction) => any, getState: any) => Promise<{}> { // tslint:disable-line
  return (dispatch: (action: ReduxAction) => any, getState): Promise<{}> => {
    const {onboardingStatusId} = getState().gettingStarted.gettingStartedState
    const step: Step = 'STEP5_WAITING'
    return updateReduxAndRelay(dispatch, step, false, onboardingStatusId, selectedExample)
  }
}

export function update(step: Step,
                       skipped: boolean,
                       onboardingStatusId: string,
                       selectedExample?: Example): ReduxAction {
  const payload = {gettingStartedState: new GettingStartedState({step, skipped, onboardingStatusId, selectedExample})}
  return {type: Constants.UPDATE, payload}
}

function updateReduxAndRelay(dispatch: (action: ReduxAction) => any,
                             gettingStarted: Step,
                             gettingStartedSkipped: boolean,
                             onboardingStatusId: string,
                             gettingStartedExample: Example = null): Promise<{}> {
  return new Promise((resolve, reject) => {
    Relay.Store.commitUpdate(
      new UpdateCustomerOnboardingStatusMutation(
        {
          onboardingStatusId,
          gettingStarted,
          gettingStartedSkipped,
          gettingStartedExample,
        }),
      {
        onSuccess: () => {
          dispatch(update(gettingStarted, gettingStartedSkipped, onboardingStatusId, gettingStartedExample))
          resolve()
        },
        onFailure: reject,
      })
  })
}

export function nextStep(): ReduxThunk {
  return (dispatch: Dispatch, getState: () => StateTree): Promise<{}> => {
    const {step, skipped, onboardingStatusId, selectedExample} = getState().gettingStarted.gettingStartedState
    const currentStepIndex = GettingStartedState.steps.indexOf(step)
    const nextStep = GettingStartedState.steps[currentStepIndex + 1]

    return updateReduxAndRelay(dispatch, nextStep, skipped, onboardingStatusId, selectedExample)
  }
}

export function previousStep(): ReduxThunk {
  return (dispatch: (action: ReduxAction) => any, getState): Promise<{}> => {
    const {step, skipped, onboardingStatusId, selectedExample} = getState().gettingStarted.gettingStartedState
    const currentStepIndex = GettingStartedState.steps.indexOf(step)
    const nextStep = GettingStartedState.steps[currentStepIndex - 1]

    return updateReduxAndRelay(dispatch, nextStep, skipped, onboardingStatusId, selectedExample)
  }
}

export function skip(): (dispatch: (action: ReduxAction) => any, getState: any) => Promise<{}> {
  return (dispatch: (action: ReduxAction) => any, getState): Promise<{}> => {
    const {step, onboardingStatusId} = getState().gettingStarted.gettingStartedState

    return updateReduxAndRelay(dispatch, step, true, onboardingStatusId)
  }
}

export function fetchGettingStartedState(): (dispatch: (action: ReduxAction) => any) => Promise<{}> {
  return (dispatch: (action: ReduxAction) => any): Promise<{}> => {
    const query = Relay.createQuery(
      Relay.QL`
        query {
          viewer {
            user {
              crm {
                onboardingStatus {
                  id
                  gettingStarted
                  gettingStartedSkipped
                  gettingStartedExample
                }
              }
            }
          }
        }`,
      {}
    )

    return new Promise((resolve: () => any, reject: (error: Error) => any) => {
      Relay.Store.primeCache({ query }, ({done, error}) => {
        if (done) {
          const data = Relay.Store.readQuery(query)[0]
          const {id, gettingStarted, gettingStartedSkipped, gettingStartedExample} = data.user.crm.onboardingStatus
          dispatch(update(gettingStarted, gettingStartedSkipped, id, gettingStartedExample))
          resolve()
        } else if (error) {
          reject(Error('Error when fetching gettingStartedState'))
        }
      })
    })
  }
}
