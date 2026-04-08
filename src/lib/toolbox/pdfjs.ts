import PdfJsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker';
import type {
	OnProgressParameters,
	PDFDocumentLoadingTask,
	PDFDocumentProxy,
	PDFPageProxy,
	RenderTask
} from 'pdfjs-dist';

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfJsPromise: Promise<PdfJsModule> | null = null;
let workerPort: Worker | null = null;

export async function loadPdfJs() {
	if (!pdfJsPromise) {
		pdfJsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs) => {
			workerPort ??= new PdfJsWorker();
			pdfjs.GlobalWorkerOptions.workerPort = workerPort;
			return pdfjs;
		});
	}

	return pdfJsPromise;
}

export type {
	OnProgressParameters,
	PDFDocumentLoadingTask,
	PDFDocumentProxy,
	PDFPageProxy,
	RenderTask
};
