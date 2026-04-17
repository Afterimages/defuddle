import { BaseExtractor } from './_base';
import { ExtractorResult } from '../types/extractors';
import { escapeHtml } from '../utils/dom';

const BVID_RE = /\/video\/(BV[0-9A-Za-z]+)\b/i;
const AVID_RE = /\/video\/av(\d+)\b/i;

function htmlParagraph(text: string): string {
	const escaped = escapeHtml(text).replace(/\n/g, '<br>');
	return `<p>${escaped}</p>`;
}

export class BilibiliExtractor extends BaseExtractor {
	canExtract(): boolean {
		// Use canonical/og:url where possible since CLI url may be a shortlink (b23.tv)
		const canonicalUrl = this.getCanonicalUrl();
		if (canonicalUrl && BVID_RE.test(canonicalUrl)) return true;

		const ogUrl = this.getMeta('property', 'og:url');
		if (ogUrl && BVID_RE.test(ogUrl)) return true;

		// Fallback heuristics: typical video pages set og:site_name / og:title
		const siteName = this.getMeta('property', 'og:site_name') || '';
		const ogTitle = this.getMeta('property', 'og:title') || '';
		return /哔哩哔哩|bilibili/i.test(siteName) && ogTitle.length > 0;
	}

	extract(): ExtractorResult {
		const canonicalUrl = this.getCanonicalUrl() || this.url;
		const title = this.getTitle();
		const description = this.getDescription();
		const cover = this.getMeta('property', 'og:image') || '';
		const author = this.getMeta('name', 'author') || '';

		const bvid = this.extractBvid(canonicalUrl) || this.extractBvidFromDom();
		const avid = this.extractAvid(canonicalUrl);

		const contentHtml = this.buildContentHtml({
			canonicalUrl,
			title,
			description,
			cover,
			author,
			bvid,
			avid,
		});

		return {
			content: '',
			contentHtml,
			variables: {
				title,
				description,
				author,
				site: 'Bilibili',
				...(bvid ? { bvid } : {}),
				...(avid ? { avid } : {}),
				...(canonicalUrl ? { canonicalUrl } : {}),
				...(cover ? { cover } : {}),
			},
		};
	}

	private buildContentHtml(input: {
		canonicalUrl: string;
		title: string;
		description: string;
		cover: string;
		author: string;
		bvid: string;
		avid: string;
	}): string {
		const parts: string[] = [];
		parts.push('<article class="defuddle-extractor bilibili">');

		if (input.title) {
			parts.push(`<h1>${escapeHtml(input.title)}</h1>`);
		}

		if (input.canonicalUrl) {
			const href = escapeHtml(input.canonicalUrl);
			parts.push(`<p><a href="${href}">${href}</a></p>`);
		}

		if (input.author) {
			parts.push(htmlParagraph(`UP主：${input.author}`));
		}
		if (input.bvid) {
			parts.push(htmlParagraph(`BVID：${input.bvid}`));
		} else if (input.avid) {
			parts.push(htmlParagraph(`AID：${input.avid}`));
		}

		if (input.cover) {
			const src = escapeHtml(input.cover);
			parts.push(`<p><img src="${src}" alt="cover"></p>`);
		}

		if (input.description) {
			parts.push('<h2>简介</h2>');
			parts.push(htmlParagraph(input.description));
		}

		parts.push('</article>');
		return parts.join('\n');
	}

	private getMeta(attr: 'name' | 'property', value: string): string {
		// Avoid CSS.escape — not available in all DOM implementations used by Defuddle (e.g. linkedom).
		for (const meta of Array.from(this.document.querySelectorAll(`meta[${attr}]`))) {
			if (meta.getAttribute(attr) === value) {
				return meta.getAttribute('content') || '';
			}
		}
		return '';
	}

	private getCanonicalUrl(): string {
		const href = this.document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
		return href.trim();
	}

	private getTitle(): string {
		const ogTitle = this.getMeta('property', 'og:title');
		if (ogTitle) return ogTitle.trim();
		const title = (this.document.querySelector('title')?.textContent || '').trim();
		return title.replace(/\s*-\s*哔哩哔哩.*$/u, '').trim();
	}

	private getDescription(): string {
		const ogDesc = this.getMeta('property', 'og:description');
		if (ogDesc) return ogDesc.trim();
		const desc = this.getMeta('name', 'description');
		return desc.trim();
	}

	private extractBvid(url: string): string {
		const match = url.match(BVID_RE);
		return match?.[1] || '';
	}

	private extractAvid(url: string): string {
		const match = url.match(AVID_RE);
		return match?.[1] || '';
	}

	private extractBvidFromDom(): string {
		// Last-resort: scan scripts for a bvid key.
		for (const script of Array.from(this.document.querySelectorAll('script'))) {
			const text = script.textContent || '';
			const match = text.match(/\"bvid\"\s*:\s*\"(BV[0-9A-Za-z]+)\"/);
			if (match?.[1]) return match[1];
		}
		return '';
	}
}
