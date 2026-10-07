import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PrivacyNotice } from './components/PrivacyNotice';
import { MaskCanvas } from './components/MaskCanvas';
import { MaskList } from './components/MaskList';
import { SubmissionForm } from './components/SubmissionForm';
import { ExportPanel } from './components/ExportPanel';
import { Footer } from './components/Footer';
import { RequestPanel } from './components/RequestPanel';
import { LinkBuilder } from './components/LinkBuilder';
import { DeletionRequest } from './components/DeletionRequest';
import { EMPTY_LINK, isRequestLink, parseRequestLink, type RequestLink } from './lib/link';
import { initialMaskState, maskReducer } from './lib/masks';
import { loadImageFromFile, loadSampleImage } from './lib/image';
import { buildWatermarkText, todayIso } from './lib/watermark';
import type { LoadedImage, NormalizedRect, SubmissionDetails } from './lib/types';
import { DEFAULT_PURPOSE, getPurposeRule } from './rules/purposeRules';

export const SAMPLE_IMAGE_PATH = '/sample/sample-id.png';

function initialDetails(link: RequestLink): SubmissionDetails {
  return {
    purpose: link.purpose ?? DEFAULT_PURPOSE,
    customPurpose: link.customPurpose ?? '',
    recipient: link.recipient ?? '',
    date: todayIso(),
  };
}

function readLink(): RequestLink {
  return typeof window === 'undefined' ? EMPTY_LINK : parseRequestLink(window.location.hash);
}

type View = 'app' | 'business' | 'delete';

export function App() {
  // The request link (if any) is read once from the URL fragment. Fragments
  // never reach the server, so a recipient's name stays on the device.
  const [link, setLink] = useState<RequestLink>(readLink);
  const [view, setView] = useState<View>(() => link.view ?? 'app');
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maskState, dispatch] = useReducer(maskReducer, initialMaskState);
  const [details, setDetails] = useState<SubmissionDetails>(() => initialDetails(link));
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const hasRequest = isRequestLink(link);

  const watermark = useMemo(() => buildWatermarkText(details), [details]);
  const rule = getPurposeRule(details.purpose);
  const needsAcknowledgement = Boolean(rule.warning) && !warningAcknowledged;

  const openFile = useCallback(async (file: File) => {
    setLoadError(null);
    try {
      const loaded = await loadImageFromFile(file);
      dispatch({ type: 'clear' });
      setImage(loaded);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '画像を読み込めませんでした。');
    }
  }, []);

  const openSample = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded = await loadSampleImage(SAMPLE_IMAGE_PATH);
      dispatch({ type: 'clear' });
      setImage(loaded);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'サンプルを読み込めませんでした。');
    }
  }, []);

  const reset = useCallback(() => {
    // Dropping the reference is all that is needed: the bitmap only ever
    // lived in memory, so nothing else has to be cleaned up.
    setImage(null);
    dispatch({ type: 'clear' });
    setWarningAcknowledged(false);
  }, []);

  const addMask = useCallback((rect: NormalizedRect, source: 'pointer' | 'keyboard') => {
    dispatch({ type: 'add', rect, source });
  }, []);

  const dismissRequest = useCallback(() => {
    setLink(EMPTY_LINK);
    setDetails(initialDetails(EMPTY_LINK));
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const openView = useCallback((next: Exclude<View, 'app'>) => {
    setView(next);
    window.history.replaceState(null, '', `#view=${next}`);
    window.scrollTo(0, 0);
  }, []);

  const openBusiness = useCallback(() => openView('business'), [openView]);
  const openDeletion = useCallback(() => openView('delete'), [openView]);

  const closeView = useCallback(() => {
    setView('app');
    window.history.replaceState(null, '', window.location.pathname);
    window.scrollTo(0, 0);
  }, []);

  const changeDetails = useCallback(
    (next: SubmissionDetails) => {
      // Reset the acknowledgement whenever the purpose changes.
      if (next.purpose !== details.purpose) setWarningAcknowledged(false);
      setDetails(next);
    },
    [details.purpose],
  );

  // Links opened while the page is already loaded only change the fragment;
  // pick those up as well so a pasted request link always takes effect.
  useEffect(() => {
    const onHashChange = () => {
      const next = parseRequestLink(window.location.hash);
      if (next.view) {
        setView(next.view);
        return;
      }
      setView('app');
      if (isRequestLink(next)) {
        setLink(next);
        setDetails(initialDetails(next));
        setWarningAcknowledged(false);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [image]);

  if (view !== 'app') {
    return (
      <div className="app">
        <Header />
        <main id="main" className="main">
          {view === 'business' ? (
            <LinkBuilder origin={window.location.origin} onBack={closeView} />
          ) : (
            <DeletionRequest onBack={closeView} />
          )}
        </main>
        <Footer onOpenBusiness={openBusiness} onOpenDeletion={openDeletion} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <main id="main" className="main">
        {!image ? (
          <>
            {hasRequest ? <RequestPanel link={link} onDismiss={dismissRequest} /> : null}
            <Hero onFile={openFile} onSample={openSample} onOpenDeletion={openDeletion} error={loadError} />
            <PrivacyNotice variant="full" />
          </>
        ) : (
          <div className="workspace">
            <PrivacyNotice variant="compact" />
            {hasRequest ? <RequestPanel link={link} onDismiss={dismissRequest} /> : null}

            <section className="step" aria-labelledby="step-mask">
              <div className="step__head">
                <span className="step__index" aria-hidden="true">01</span>
                <h2 id="step-mask" className="step__title">隠す</h2>
                <p className="step__lead">画像の上でドラッグ（またはスワイプ）して、見せたくない部分を黒塗りします。</p>
              </div>
              <MaskCanvas image={image} masks={maskState.masks} watermark={watermark} onAddMask={addMask} />
              <MaskList
                masks={maskState.masks}
                canUndo={maskState.masks.length > 0}
                canRedo={maskState.redoStack.length > 0}
                onUndo={() => dispatch({ type: 'undo' })}
                onRedo={() => dispatch({ type: 'redo' })}
                onClear={() => dispatch({ type: 'clear' })}
                onRemove={(id) => dispatch({ type: 'remove', id })}
                onAdd={(rect) => addMask(rect, 'keyboard')}
              />
            </section>

            <section className="step" aria-labelledby="step-details">
              <div className="step__head">
                <span className="step__index" aria-hidden="true">02</span>
                <h2 id="step-details" className="step__title">記す</h2>
                <p className="step__lead">提出先と用途を画像全体に薄く刻み、別の目的で使い回されにくくします。</p>
              </div>
              <SubmissionForm
                details={details}
                onChange={changeDetails}
                warningAcknowledged={warningAcknowledged}
                onAcknowledge={setWarningAcknowledged}
              />
            </section>

            <section className="step" aria-labelledby="step-export">
              <div className="step__head">
                <span className="step__index" aria-hidden="true">03</span>
                <h2 id="step-export" className="step__title">書き出す</h2>
                <p className="step__lead">新しい画像として生成します。元の写真の位置情報や撮影情報は含まれません。</p>
              </div>
              <ExportPanel
                image={image}
                masks={maskState.masks}
                watermark={watermark}
                blocked={needsAcknowledgement ? '上の注意を確認してからコピーを作成できます。' : null}
                onReset={reset}
              />
            </section>
          </div>
        )}
      </main>
      <Footer onOpenBusiness={openBusiness} onOpenDeletion={openDeletion} />
    </div>
  );
}
