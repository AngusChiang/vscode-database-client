import axios from "axios";
import { Node } from "@/model/interface/node";
import { IConnection, queryCallback } from "./connection";

export class EsConnection implements IConnection {

    private url: string;
    private conneted: boolean;
    constructor(private opt: Node) {
        this.url = `${opt.scheme}://${opt.host}:${opt.port}`
    }

    query(sql: string, callback?: queryCallback): void;
    query(sql: string, values: any, callback?: queryCallback): void;
    query(sql: any, values?: any, callback?: any) {
        if (!callback && values instanceof Function) {
            callback = values;
        }
        const splitIndex = sql.indexOf('\n')
        let [type, path] = (splitIndex == -1 ? sql : sql.substring(0, splitIndex)).split(' ')
        if (path?.charAt(0) != "/") {
            path = "/" + path
        }
        const body = splitIndex == -1 ? null : sql.substring(splitIndex + 1) + "\n"

        axios({
            method: type,
            url: `${this.url}${path}`,
            headers: {
                'Content-Type': 'application/json',
            },
            responseType: 'json',
            data: body
        }).then(async ({ data }) => {
            if(values=="dontParse"){
                callback(null,data)
                return;
            }
            if (data.count) {
                callback(null, [{ count: data.count }], [{ name: 'count', nullable: 'YES' }])
            } else if (data.items || data?.result == 'created' || data?.result == 'updated' || data?.result == 'deleted') {
                callback(null, { affectedRows: data.items ? data.items.length : 1 })
            } else if (data?.hits?.hits) {
                this.handleSearch(path, data, callback);
            } else {
                callback(null, data)
            }
        }).catch(err => {
            console.log(err)
            callback(err)
        })
    }
    private async handleSearch(path: any, data: any, callback: any) {
        let fields = null;

        let rows = data.hits.hits.map((hit: any) => {
            if (!fields) {
                fields = [];
                for (const key in hit._source) {
                    fields.push({ name: key, type: 'text', nullable: 'YES' });
                }
            }
            let row = { _index: hit._index, _type: hit._type, _id: hit._id, _score: hit._score };
            for (const key in hit._source) {
                row[key] = hit._source[key];
                if (row[key] instanceof Object) {
                    row[key] = JSON.stringify(row[key]);
                }
            }
            if (hit.highlight) {
                for (const key in hit.highlight) {
                    row[key] = hit.highlight[key].map((hv:any) => (hv instanceof Object) ? JSON.stringify(hv) : hv).join(",")
                }
            }
            return row;
        });
        if (!fields) {
            const indexName = path.split('/')[1];
            const indexNode = Node.nodeCache[`${this.opt.getConnectId()}_${indexName}`] as Node;
            fields = (await indexNode?.getChildren())?.map((node: any) => { return { name: node.label, type: node.type, nullable: 'YES' }; }) as any;
        }
        fields.unshift({ name: "_id" }, { name: "_score" });
        callback(null, rows, fields, data.hits.total.value || data.hits.total);
    }

    connect(callback: (err: Error) => void): void {
        axios.get(`${this.url}/_cluster/health`).then(res => {
            this.conneted = true;
            callback(null)
        }).catch(err => {
            callback(err)
        })

    }
    beginTransaction(callback: (err: Error) => void): void {
    }
    rollback(): void {
    }
    commit(): void {
    }
    end(): void {
    }
    isAlive(): boolean {
        return this.conneted;
    }

}