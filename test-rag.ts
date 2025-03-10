#!/usr/bin/env node

/**
 * シンプルなRAGテストスクリプト - MCPサーバーを介さずに直接インデックスを使用します
 * src/index.tsからエクスポートされた関数を使ってテストを行います
 */

// .envファイルから環境変数を読み込む
import * as dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";

// GEMINI_API_KEYをGOOGLE_API_KEYにマッピング（ライブラリが自動的に取得するため）
if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}

// index.tsからエクスポートされた関数と変数をインポート
import { DOCS_PATH, INDICES_PATH, loadDocument } from "./src/index.js";

// 対象のドキュメントID
const documentId = "honojs";

// メイン関数
async function main() {
  console.log(`RAGテストを開始します - ドキュメント: ${documentId}`);
  console.time("処理時間");

  try {
    // インデックスディレクトリのパス
    const indexDir = path.join(INDICES_PATH, documentId);
    console.log(`インデックスディレクトリ: ${indexDir}`);
    
    // インデックスが存在するか確認し、存在しない場合は自動的に作成されることを表示
    if (!fs.existsSync(indexDir)) {
      console.log(`インデックスが存在しません。loadDocument関数により自動的に作成されます...`);
    } else {
      // 既存のインデックスファイルを確認
      const indexFiles = fs.readdirSync(indexDir);
      console.log("\n--- インデックスファイル ---");
      indexFiles.forEach(file => {
        const stats = fs.statSync(path.join(indexDir, file));
        console.log(`${file} - ${(stats.size / 1024).toFixed(2)} KB`);
      });
    }
    
    // index.tsからエクスポートされたloadDocument関数を使用してインデックスをロードまたは作成
    console.log("\nインデックスをロードまたは作成中...");
    const index = await loadDocument(documentId);
    console.log("インデックスのロードまたは作成完了");
    
    // インデックスの基本情報を表示
    console.log("\n--- インデックス情報 ---");
    console.log(`ドキュメントID: ${documentId}`);
    
    // indexの基本的な情報を抽出して表示
    const indexSummary = {
      type: index.constructor.name,
      docStore: Boolean(index.docStore),
      vectorStores: Boolean(index.vectorStores),
      indexStore: Boolean(index.indexStore),
    };
    
    console.log("インデックス構造:", JSON.stringify(indexSummary, null, 2));
    
    // クエリエンジンを作成してテストクエリを実行
    const queryEngine = index.asQueryEngine();
    
    // テストクエリを実行
    const testQuery = "Honoの特徴と基本的な使い方を教えてください";
    console.log(`\nクエリを実行: "${testQuery}"`);
    
    const response = await queryEngine.query({
      query: testQuery,
    });
    
    console.log("\n--- クエリ結果 ---");
    console.log(response.toString());
    
    // ノードソース（引用元）の表示
    console.log("\n--- 引用元 ---");
    if (response.sourceNodes && response.sourceNodes.length > 0) {
      response.sourceNodes.forEach((node, i) => {
        console.log(`\n[引用 ${i+1}]`);
        
        // 安全にノード情報を出力
        try {
          console.log(`スコア: ${node.score || 0}`);
          
          // JSONとしてノードの情報を表示
          const nodeInfo = JSON.stringify(node.node, null, 2);
          console.log(`ノード情報: ${nodeInfo.substring(0, 500)}...`);
        } catch (error) {
          console.log(`ノード情報の出力中にエラーが発生しました: ${error.message}`);
        }
      });
    } else {
      console.log("引用元情報がありません");
    }
    
    // 処理後のインデックスファイルを確認
    if (fs.existsSync(indexDir)) {
      const indexFiles = fs.readdirSync(indexDir);
      console.log("\n--- 処理後のインデックスファイル ---");
      indexFiles.forEach(file => {
        const stats = fs.statSync(path.join(indexDir, file));
        console.log(`${file} - ${(stats.size / 1024).toFixed(2)} KB`);
      });
      
      // doc_store.jsonファイルの確認
      const docStorePath = path.join(indexDir, 'doc_store.json');
      const indexStorePath = path.join(indexDir, 'index_store.json');
      
      console.log("\n--- インデックスファイル確認 ---");
      console.log(`doc_store.json: ${fs.existsSync(docStorePath) ? '存在します' : '存在しません'}`);
      console.log(`index_store.json: ${fs.existsSync(indexStorePath) ? '存在します' : '存在しません'}`);
      
      if (fs.existsSync(docStorePath)) {
        const stats = fs.statSync(docStorePath);
        console.log(`doc_store.jsonサイズ: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      }
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
  }
  
  console.timeEnd("処理時間");

  // 終了する
  process.exit(0);
}

// スクリプト実行
main().catch(console.error);
