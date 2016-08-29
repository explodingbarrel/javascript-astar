// javascript-astar 0.2.0
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html

"use strict";

(function(definition) {
    if(typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = definition();
    } else if(typeof define === 'function' && define.amd) {
        define([], definition);
    } else {
        var exports = definition();
        window.astar = exports.astar;
        window.Graph = exports.Graph;
    }
})(function() {

var astar = {
    init: function(grid) {
        for(var x = 0, xl = grid.length; x < xl; x++) {
            for(var y = 0, yl = grid[x].length; y < yl; y++) {
                var node = grid[x][y];
                node.f = 0;
                node.g = 0;
                node.h = 0;
                node.cost = node.type;
                node.visited = false;
                node.closed = false;
                node.parent = null;
            }
        }
    },
    heap: function() {
        return new BinaryHeap(function(node) {
            return node.f;
        });
    },

    // astar.search
    // supported options:
    // {
    //   heuristic: heuristic function to use
    //   diagonal: boolean specifying whether diagonal moves are allowed
    //   closest: boolean specifying whether to return closest node if
    //            target is unreachable
    // }
    search: function(grid, start, end, options) {
        astar.init(grid);

        options = options || {};
        var heuristic = options.heuristic || astar.manhattan;
        var diagonal = !!options.diagonal;
        var portals = !!options.portals;
        var closest = options.closest || false;

        var openHeap = astar.heap();

        // set the start node to be the closest if required
        var closestNode = start;

        start.h = heuristic(start.pos, end.pos);

        function pathTo(node){
            var curr = node;
            var path = [];
            while(curr.parent) {
                path.push(curr);
                curr = curr.parent;
            }
            return path.reverse();
        }


        openHeap.push(start);

        while(openHeap.size() > 0) {

            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();

            // End case -- result has been found, return the traced path.
            if(currentNode === end) {
                return pathTo(currentNode);
            }

            // Normal case -- move currentNode from open to closed, process each of its neighbors.
            currentNode.closed = true;

            // Find all neighbors for the current node. Optionally find diagonal neighbors as well (false by default).
            var disabledDirections = (currentNode.options.disabledDirections != null) ? currentNode.options.disabledDirections : {};
            var portalTargets = ((currentNode.options.portalTargets != null) && portals) ? currentNode.options.portalTargets : [];
            var neighbors = astar.neighbors(grid, currentNode, {diagonals:diagonal, disabledDirections:disabledDirections, portalTargets:portalTargets});

            var validNeighborCount = 0;
            for(var i in neighbors) {
                var neighbor = neighbors[i];
                if (!neighbor.closed && !neighbor.isWall() && !beenVisited) {
                    validNeighborCount++;
                }
            }

            //This will help us find paths that are mostly not diagonal, but may have node that diagonal is the only option
            if ((validNeighborCount == 0) && (diagonal == false)) {
                astar.neighbors(grid, currentNode, {diagonals:true, disabledDirections:disabledDirections, portalTargets:portalTargets});
            }

            for(var i=0, il = neighbors.length; i < il; i++) {
                var neighbor = neighbors[i];

                if(neighbor.closed || neighbor.isWall()) {
                    // Not a valid node to process, skip to next neighbor.
                    continue;
                }

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                var gScore = currentNode.g + neighbor.cost;
                var beenVisited = neighbor.visited;

                if(!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || heuristic(neighbor.pos, end.pos);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;

                    if (closest) {
                        // If the neighbour is closer than the current closestNode or if it's equally close but has
                        // a cheaper path than the current closest node then it becomes the closest node
                        if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                            closestNode = neighbor;
                        }
                    }



                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'f' value.
                        openHeap.push(neighbor);
                    }
                    else {
                        // Already seen the node, but since it has been rescored we need to reorder it in the heap
                        openHeap.rescoreElement(neighbor);
                    }
                }
            }
        }

        if (closest) {
            return pathTo(closestNode);
        }

        // No result was found - empty array signifies failure to find path.
        return [];
    },
    manhattan: function(pos0, pos1) {
        // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html

        var d1 = Math.abs (pos1.x - pos0.x);
        var d2 = Math.abs (pos1.y - pos0.y);
        return d1 + d2;
    },
    diagonal: function(pos0, pos1) {
        var D = 1;
        var D2 = Math.sqrt(2);
        var d1 = Math.abs (pos1.x - pos0.x);
        var d2 = Math.abs (pos1.y - pos0.y);
        return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    },
    neighbors: function(grid, node, options) {
        var ret = [];
        var x = node.x;
        var y = node.y;

        options = options || {};
        var diagonals = options.diagonals || false;
        var dd = options.disabledDirections || {};
        var pt = options.portalTargets || [];

        function IsDirectionEnabled(dir) {
            return !dd[dir];
        }

        function PositionExists(px, py) {
            return (grid[px] && grid[px][py]);
        }

        // West
        if(grid[x-1] && grid[x-1][y] && IsDirectionEnabled('w')) {
            ret.push(grid[x-1][y]);
        }

        // East
        if(grid[x+1] && grid[x+1][y] && IsDirectionEnabled('e')) {
            ret.push(grid[x+1][y]);
        }

        // South
        if(grid[x] && grid[x][y-1] && IsDirectionEnabled('s')) {
            ret.push(grid[x][y-1]);
        }

        // North
        if(grid[x] && grid[x][y+1] && IsDirectionEnabled('n')) {
            ret.push(grid[x][y+1]);
        }

        if (diagonals) {

            // Southwest
            if(grid[x-1] && grid[x-1][y-1] && IsDirectionEnabled('sw')) {
                ret.push(grid[x-1][y-1]);
            }

            // Southeast
            if(grid[x+1] && grid[x+1][y-1] && IsDirectionEnabled('se')) {
                ret.push(grid[x+1][y-1]);
            }

            // Northwest
            if(grid[x-1] && grid[x-1][y+1] && IsDirectionEnabled('nw')) {
                ret.push(grid[x-1][y+1]);
            }

            // Northeast
            if(grid[x+1] && grid[x+1][y+1] && IsDirectionEnabled('ne')) {
                ret.push(grid[x+1][y+1]);
            }

        }

        for (var p=0; p<pt.length; p++) {
            var target = pt[p];
            if (PositionExists(target.x, target.y)) {
                ret.push(grid[target.x][target.y]);
            }
        }

        return ret;
    }
};

function Graph(grid) {
    var nodes = [];

    for (var x = 0; x < grid.length; x++) {
        nodes[x] = [];

        for (var y = 0, row = grid[x]; y < row.length; y++) {
            nodes[x][y] = new GraphNode(x, y, row[y].cost, row[y].options);
        }
    }

    this.input = grid;
    this.nodes = nodes;
}

Graph.prototype.toString = function() {
    var graphString = "\n";
    var nodes = this.nodes;
    var rowDebug, row, y, l;
    for (var x = 0, len = nodes.length; x < len; x++) {
        rowDebug = "";
        row = nodes[x];
        for (y = 0, l = row.length; y < l; y++) {
            rowDebug += row[y].type + " ";
        }
        graphString = graphString + rowDebug + "\n";
    }
    return graphString;
};

function GraphNode(x, y, type, options) {
    this.data = { };
    this.x = x;
    this.y = y;
    this.pos = {
        x: x,
        y: y
    };
    this.type = type;
    this.options = options || {};
}

GraphNode.prototype.toString = function() {
    return "[" + this.x + " " + this.y + "]";
};

GraphNode.prototype.isWall = function() {
    return this.type === 0;
};

function BinaryHeap(scoreFunction){
    this.content = [];
    this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
    push: function(element) {
        // Add the new element to the end of the array.
        this.content.push(element);

        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
    },
    pop: function() {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this.content.pop();
        // If there are any elements left, put the end element at the
        // start, and let it bubble up.
        if (this.content.length > 0) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    },
    remove: function(node) {
        var i = this.content.indexOf(node);

        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();

        if (i !== this.content.length - 1) {
            this.content[i] = end;

            if (this.scoreFunction(end) < this.scoreFunction(node)) {
                this.sinkDown(i);
            }
            else {
                this.bubbleUp(i);
            }
        }
    },
    size: function() {
        return this.content.length;
    },
    rescoreElement: function(node) {
        this.sinkDown(this.content.indexOf(node));
    },
    sinkDown: function(n) {
        // Fetch the element that has to be sunk.
        var element = this.content[n];

        // When at 0, an element can not sink any further.
        while (n > 0) {

            // Compute the parent element's index, and fetch it.
            var parentN = ((n + 1) >> 1) - 1,
                parent = this.content[parentN];
            // Swap the elements if the parent is greater.
            if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                this.content[parentN] = element;
                this.content[n] = parent;
                // Update 'n' to continue at the new position.
                n = parentN;
            }

            // Found a parent that is less, no need to sink any further.
            else {
                break;
            }
        }
    },
    bubbleUp: function(n) {
        // Look up the target element and its score.
        var length = this.content.length,
            element = this.content[n],
            elemScore = this.scoreFunction(element);

        while(true) {
            // Compute the indices of the child elements.
            var child2N = (n + 1) << 1, child1N = child2N - 1;
            // This is used to store the new position of the element,
            // if any.
            var swap = null;
            var child1Score;
            // If the first child exists (is inside the array)...
            if (child1N < length) {
                // Look it up and compute its score.
                var child1 = this.content[child1N];
                child1Score = this.scoreFunction(child1);

                // If the score is less than our element's, we need to swap.
                if (child1Score < elemScore){
                    swap = child1N;
                }
            }

            // Do the same checks for the other child.
            if (child2N < length) {
                var child2 = this.content[child2N],
                    child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null ? elemScore : child1Score)) {
                    swap = child2N;
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            }

            // Otherwise, we are done.
            else {
                break;
            }
        }
    }
};

return {
    astar: astar,
    Graph: Graph
};

});
