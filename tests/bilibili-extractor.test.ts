import { describe, expect, test } from 'vitest';
import { Defuddle } from '../src/node';
import { parseDocument } from './helpers';

function buildMinimalBilibiliVideoHtml(params: {
	canonicalUrl: string;
	title: string;
	description: string;
	coverUrl?: string;
	author?: string;
}): string {
	return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${params.title} - 哔哩哔哩</title>
    <link rel="canonical" href="${params.canonicalUrl}" />
    <meta property="og:site_name" content="哔哩哔哩" />
    <meta property="og:title" content="${params.title}" />
    <meta property="og:description" content="${params.description}" />
    ${params.coverUrl ? `<meta property="og:image" content="${params.coverUrl}" />` : ''}
    ${params.author ? `<meta name="author" content="${params.author}" />` : ''}
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`;
}

describe('BilibiliExtractor', () => {
	test('extracts basic metadata and custom variables from a bilibili video page', async () => {
		const canonicalUrl = 'https://www.bilibili.com/video/BV1AbCdEfGh1/';
		const html = buildMinimalBilibiliVideoHtml({
			canonicalUrl,
			title: '测试视频标题',
			description: '这里是简介第一行\n这里是第二行',
			coverUrl: 'https://i0.hdslb.com/bfs/archive/cover.jpg',
			author: '某UP主',
		});

		// Important: url passed to Defuddle may be a shortlink; extractor must rely on canonical.
		const url = 'https://b23.tv/abcd';
		const doc = parseDocument(html, url);
		const res = await Defuddle(doc, url, { separateMarkdown: true });

		expect(res.extractorType).toBe('bilibili');
		expect(res.site).toBe('Bilibili');
		expect(res.title).toBe('测试视频标题');
		expect(res.author).toBe('某UP主');
		expect(res.contentMarkdown?.length).toBeGreaterThan(0);

		// Custom variables are filtered into res.variables
		expect(res.variables?.bvid).toBe('BV1AbCdEfGh1');
		expect(res.variables?.canonicalUrl).toBe(canonicalUrl);
		expect(res.variables?.cover).toContain('cover.jpg');
	});
});
